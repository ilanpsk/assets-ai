from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
import uuid
import os
import pandas as pd
from typing import List, Dict, Any, Optional
import logging
import difflib
import re
from pathlib import Path

from app.models.job import Job, JobType, JobStatus
from app.models.custom_field import CustomFieldDefinition, CustomFieldTarget
from app.models.user import User
from app.models.system_setting import SystemSetting
from app.schemas.role import RoleName
from app.core.logging import log_activity
from app.core.exceptions import (
    ResourceNotFound,
    ValidationException,
    DuplicateResource,
    AppException
)
from app.models.asset_set import AssetSet
from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.schemas.asset import AssetCreate
from app.models.custom_field import CustomFieldType
from app.services import import_mapping_ai


logger = logging.getLogger("app.services.import")

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads")).resolve()
ALLOWED_EXTS = {".csv", ".xlsx", ".xls", ".json"}
DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50MB

def _validate_ext(filename: str | None) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise ValidationException(f"Unsupported file type: {ext or '(none)'}. Allowed: {', '.join(ALLOWED_EXTS)}")
    return ext

def _validate_safe_path(file_path: str) -> Path:
    """
    Ensures the file path is safe to read (no traversal, no URL/SSRF, must be in uploads dir).
    """
    if not file_path:
        raise ValidationException("File path is empty")
        
    # Block URL schemes (pandas can read URLs)
    if "://" in str(file_path):
        raise ValidationException("Invalid file path: URLs are not allowed")
        
    try:
        p = Path(file_path).resolve()
        # Ensure it is within the upload directory
        if UPLOAD_DIR not in p.parents and p != UPLOAD_DIR:
             # Just in case we want to allow reading from a specific seed dir later, but for now strict.
             # Actually, seed data might be elsewhere, but imports should be in uploads.
             # If it's absolute and existing, check if it's safe.
             # For now, strict: must be in UPLOAD_DIR.
             pass
        
        # We perform the check:
        if not str(p).startswith(str(UPLOAD_DIR)):
             # Additional check for testing or seeds if necessary, 
             # but strictly imported files are here.
             # Let's allow if it exists and is a file, BUT strictly block 'http' etc above.
             # Real security: Must be in UPLOAD_DIR.
             raise ValidationException("Invalid file path: Access denied")
             
        if not p.is_file():
             raise ValidationException(f"File not found: {file_path}")
             
        return p
    except Exception as e:
        if isinstance(e, ValidationException):
            raise e
        raise ValidationException(f"Invalid file path structure")

def _read_file(file_path: str) -> pd.DataFrame:
    # validate path first
    _validate_safe_path(file_path)
    
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".csv":
            return pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            return pd.read_excel(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        else:
            raise ValidationException(f"Unsupported file format: {ext}")
    except pd.errors.ParserError as e:
         raise ValidationException(f"Failed to parse file: {str(e)}")
    except Exception as e:
         if isinstance(e, ValidationException):
             raise e
         raise ValidationException(f"Error reading file: {str(e)}")

@log_activity
async def analyze_file(db: AsyncSession, file_path: str, use_ai: bool = False) -> Dict[str, Any]:
    """
    Analyzes an import file to determine matched columns, new columns, and user mappings.
    """
    try:
        # 1. Read Headers
        df = _read_file(file_path)
        headers = list(df.columns)
        
        # 2. Fetch Known Fields
        # Static Asset Fields
        static_fields = {"name", "status", "serial_number", "location", "tags", "asset_type_id", "purchase_date", "purchase_price", "vendor", "order_number", "warranty_end", "assigned_user_id"}
        
        # Custom Fields (Global)
        res = await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.asset_set_id == None))
        custom_fields = {f.key: f for f in res.scalars().all()}
        
        mapped_fields = []
        new_fields = []
        
        for h in headers:
            key = h.lower().strip().replace(" ", "_")
            if key in static_fields:
                mapped_fields.append({"header": h, "target": "static", "key": key})
            elif key in custom_fields:
                mapped_fields.append({"header": h, "target": "custom", "key": key})
            else:
                new_fields.append(h)
                
        # 3. User Matching (Fuzzy)
        # Look for potential user columns
        user_matches = {}
        potential_user_cols = [h for h in headers if "user" in h.lower() or "owner" in h.lower() or "email" in h.lower()]
        
        if potential_user_cols:
            # Fetch all users for matching (optimize for large sets later)
            res = await db.execute(select(User))
            all_users = res.scalars().all()
            user_map = {u.email.lower(): u.id for u in all_users}
            
            # Check unique values in first potential column
            col = potential_user_cols[0]
            unique_vals = df[col].dropna().unique()
            
            for val in unique_vals:
                val_str = str(val).strip()
                # Exact email match
                if val_str.lower() in user_map:
                    user_matches[val_str] = str(user_map[val_str.lower()])
                else:
                    # Fuzzy match logic
                    matches = difflib.get_close_matches(val_str.lower(), user_map.keys(), n=1, cutoff=0.6)
                    if matches:
                        user_matches[val_str] = str(user_map[matches[0]])

        # 4. AI Semantic Mapping (Suggest-only)
        suggested_mapping = {}
        suggestions = []
        
        if use_ai:
            from app.services.import_mapping_ai import suggest_mapping
            # Get preview rows for context
            preview_rows = df.head(3).where(pd.notnull(df), None).to_dict(orient="records")
            
            ai_result = await suggest_mapping(db, headers, preview_rows)
            if ai_result and "suggestions" in ai_result:
                suggestions = ai_result["suggestions"]
                # Convert to simple mapping for easier consumption
                for s in suggestions:
                    # Only suggest if confidence is reasonable
                    if s.get("confidence", 0) >= 0.5:
                        suggested_mapping[s["header"]] = s["target"]

        return {
            "headers": headers,
            "mapped_fields": mapped_fields,
            "new_fields": new_fields,
            "user_matches": user_matches,
            "total_rows": len(df),
            "suggested_mapping": suggested_mapping,
            "suggestions": suggestions
        }
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Analyze file failed: {str(e)}", exc_info=True)
        raise AppException(f"Failed to analyze file: {str(e)}")

@log_activity
async def analyze_user_file(db: AsyncSession, file_path: str) -> Dict[str, Any]:
    """
    Analyzes a user import file to determine matched columns and new columns.
    """
    try:
        # 1. Read Headers
        df = _read_file(file_path)
        headers = list(df.columns)
        
        # 2. Standard User Fields
        standard_fields = {"email", "full_name", "role", "password", "is_active"}
        
        mapped_fields = []
        new_fields = []
        
        for h in headers:
            key = h.lower().strip().replace(" ", "_")
            if key in standard_fields:
                mapped_fields.append({"header": h, "target": "standard", "key": key})
            elif key == "name": # Map 'name' to 'full_name'
                 mapped_fields.append({"header": h, "target": "standard", "key": "full_name"})
            else:
                new_fields.append(h)
        
        return {
            "headers": headers,
            "mapped_fields": mapped_fields,
            "new_fields": new_fields,
            "total_rows": len(df)
        }
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Analyze user file failed: {str(e)}", exc_info=True)
        raise AppException(f"Failed to analyze user file: {str(e)}")

@log_activity
async def create_import_job(db: AsyncSession, file: UploadFile, user: User) -> Job:
    # 1. Validate Extension
    ext = _validate_ext(file.filename)
    
    # 2. Determine Max Size
    max_bytes = DEFAULT_MAX_UPLOAD_BYTES
    
    # Admin bypass
    if user.has_role(RoleName.admin):
        max_bytes = 1024 * 1024 * 1024 * 10 # 10GB (effectively unlimited but safe cap)
    else:
        # Check system setting
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == "import_max_upload_mb"))
        setting = res.scalar_one_or_none()
        if setting and setting.value:
            try:
                mb = int(setting.value)
                max_bytes = mb * 1024 * 1024
            except (ValueError, TypeError):
                pass # keep default
    
    # 3. Stream to Disk
    file_id = uuid.uuid4().hex
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{file_id}{ext}"
    dest_path = UPLOAD_DIR / safe_filename
    
    try:
        size = 0
        chunk_size = 1024 * 1024 # 1MB
        
        with open(dest_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise ValidationException(f"File size exceeds limit of {max_bytes / (1024*1024):.0f}MB")
                f.write(chunk)
                
    except ValidationException:
        # Cleanup
        if dest_path.exists():
            dest_path.unlink()
        raise
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        logger.error(f"Failed to save upload: {str(e)}", exc_info=True)
        raise AppException("Failed to save uploaded file.")

    job = Job(
        type=JobType.import_assets,
        status=JobStatus.completed,
        payload={
            "file_path": str(dest_path), 
            "filename": file.filename, # original filename for reference
            "uploaded_by": str(user.id),
            "size_bytes": size
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

def parse_file_preview(file_path: str) -> Dict[str, Any]:
    """
    Returns headers and first 5 rows of the file.
    """
    try:
        df = _read_file(file_path)
        # Replace NaN with None for JSON compatibility
        df = df.where(pd.notnull(df), None)
        return {
            "headers": list(df.columns),
            "preview": df.head(5).to_dict(orient="records"),
            "total_rows": len(df)
        }
    except ValidationException as e:
         return {"error": str(e)}
    except Exception as e:
        logger.error(f"Preview failed: {str(e)}", exc_info=True)
        return {"error": f"Preview failed: {str(e)}"}

@log_activity
async def execute_import(
    db: AsyncSession, 
    job_id: UUID, 
    strategy: str, # "MERGE", "NEW_SET", or "EXISTING_SET"
    options: Dict[str, Any],
    user_id: UUID
) -> Dict[str, Any]:
    job = await get_job(db, job_id)
    file_path = job.payload.get("file_path")
    if not file_path:
        raise ValidationException("Invalid job payload: missing file_path")

    try:
        df = _read_file(file_path)
        df = df.where(pd.notnull(df), None)
        records = df.to_dict(orient="records")
        
        asset_set_id = None
        
        # Handle Strategies
        if strategy == "NEW_SET":
            set_name = options.get("new_set_name", f"Imported Set {uuid.uuid4().hex[:8]}")
            new_set = AssetSet(name=set_name, created_by_id=user_id)
            db.add(new_set)
            await db.flush()
            asset_set_id = new_set.id
            
            # Create Custom Fields for new columns
            new_fields = options.get("new_fields", [])
            for field_name in new_fields:
                key = field_name.lower().strip().replace(" ", "_")
                cf = CustomFieldDefinition(
                    target=CustomFieldTarget.asset,
                    key=key,
                    label=field_name,
                    field_type=CustomFieldType.string, # Default to string
                    asset_set_id=asset_set_id
                )
                db.add(cf)
            await db.flush()
            
        elif strategy == "EXISTING_SET":
            asset_set_id_str = options.get("asset_set_id")
            if not asset_set_id_str:
                raise ValidationException("asset_set_id is required for EXISTING_SET strategy")
            
            try:
                asset_set_id = UUID(str(asset_set_id_str))
            except ValueError:
                raise ValidationException("Invalid asset_set_id format")
                
            # Verify it exists
            res = await db.execute(select(AssetSet).where(AssetSet.id == asset_set_id))
            if not res.scalar_one_or_none():
                raise ValidationException(f"Asset set {asset_set_id} not found")

        elif strategy == "MERGE":
            # If merge, we might create global fields if requested
            if options.get("create_missing_fields"):
                new_fields = options.get("new_fields", [])
                for field_name in new_fields:
                    key = field_name.lower().strip().replace(" ", "_")
                    # Check if exists again to be safe
                    res = await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.key == key))
                    if not res.scalar_one_or_none():
                        cf = CustomFieldDefinition(
                            target=CustomFieldTarget.asset,
                            key=key,
                            label=field_name,
                            field_type=CustomFieldType.string
                        )
                        db.add(cf)
                await db.flush()

        # Execute Import
        imported_count = 0
        errors = []
        
        # Fetch Asset Statuses
        res_statuses = await db.execute(select(AssetStatus))
        all_statuses = res_statuses.scalars().all()
        status_map = {s.name.lower(): s.id for s in all_statuses}

        # Fetch Asset Types
        res_types = await db.execute(select(AssetType))
        all_types = res_types.scalars().all()
        type_map = {t.name.lower(): t.id for t in all_types}
        
        # Get mapping from options
        # Format: {"CSV_HEADER": "system_field_key"}
        # System keys: name, serial_number, status, location, asset_type_id
        field_mapping = options.get("mapping", {})
        # Normalize mapping keys to match our header normalizer
        # Note: we intentionally keep empty-string values so the user can explicitly "ignore" a column.
        field_mapping = {str(k): v for k, v in field_mapping.items()}

        def _normalize_header(h: str) -> str:
            s = (h or "").lower().strip()
            s = re.sub(r"[^a-z0-9]+", "_", s)
            return re.sub(r"_+", "_", s).strip("_")

        field_mapping = {_normalize_header(k): v for k, v in field_mapping.items()}

        for i, record in enumerate(records):
            try:
                # Basic mapping logic
                # We need to map record keys to Asset schema
                
                # Determine Name
                # Check explicit mapping first, then fallbacks
                name_val = None
                for k, v in record.items():
                    target = field_mapping.get(_normalize_header(k))
                    if target == "name":
                         name_val = v
                         break
                
                if not name_val:
                    # Extended fallback for name
                    for k, v in record.items():
                        k_norm = _normalize_header(k)
                        if k_norm in ["name", "item_name", "asset_name", "model"]:
                            name_val = v
                            break
                
                if not name_val:
                    name_val = record.get("AssetID") or f"Imported Asset {i}"
                
                asset_data = {
                    "name": str(name_val),
                    "asset_set_id": asset_set_id,
                    "extra": {}
                }
                
                for k, v in record.items():
                    k_norm = _normalize_header(k)
                    # Fix: 0 or 0.0 should be treated as valid string "0", not None
                    val_str = str(v) if v is not None and str(v).strip() != "" else None
                    if val_str is None: continue

                    # Check explicit mapping
                    target = field_mapping.get(k_norm)

                    # Explicit ignore: do not import this column at all.
                    if target == "":
                        continue
                    
                    # If no explicit mapping, try intelligent default mapping (fallback)
                    if not target:
                         if k_norm in ["assetid", "asset_id", "legacy_id"] and "name" not in field_mapping.values(): 
                             pass
                         elif k_norm in ["serial", "serial_number", "servicetag", "service_tag", "s_n", "sn"]: target = "serial_number"
                         elif k_norm in ["status", "state", "current_state", "current_status"]: target = "status"
                         elif k_norm in ["location", "site", "room"]: target = "location"
                         elif k_norm in ["category", "type", "model_type", "asset_type"]: target = "asset_type_id"
                         elif k_norm in ["cost", "purchase_price", "price", "bought_price"]: target = "purchase_price"
                         elif k_norm in ["bought_date", "purchase_date", "date_bought"]: target = "purchase_date"
                         elif k_norm in ["supplier", "vendor"]: target = "vendor"
                         elif k_norm in ["po_number", "order_number", "po"]: target = "order_number"
                         elif k_norm in ["warranty_end", "warranty_date"]: target = "warranty_end"
                         elif k_norm in ["assigned_user", "assigned_to", "owner", "user"]: target = "assigned_user_id"
                         elif k_norm in ["tags", "tag"]: target = "tags"
                    
                    if target == "name":
                        continue # Already handled
                    elif target == "serial_number":
                        asset_data["serial_number"] = val_str
                    elif target == "location":
                        asset_data["location"] = val_str
                    elif target == "warranty_end":
                        try:
                            asset_data["warranty_end"] = pd.to_datetime(val_str).date()
                        except:
                            pass
                    elif target == "assigned_user_id":
                         try:
                             # Try as UUID
                             uuid.UUID(val_str)
                             asset_data["assigned_user_id"] = val_str
                         except ValueError:
                             # Try as Email
                             # Note: In high volume, this N+1 query is slow. 
                             # Ideally we'd pre-load users, but for now this works.
                             res_u = await db.execute(select(User).where(User.email == val_str))
                             u = res_u.scalar_one_or_none()
                             if u:
                                 asset_data["assigned_user_id"] = u.id
                    elif target == "tags":
                        tags_list = []
                        if "," in val_str:
                            tags_list = [t.strip() for t in val_str.split(",")]
                        elif ";" in val_str:
                            tags_list = [t.strip() for t in val_str.split(";")]
                        else:
                            tags_list = [val_str.strip()]
                        asset_data["tags"] = [t for t in tags_list if t]
                    elif target == "purchase_price":
                        try:
                            # Simple cleanup
                            cleaned = val_str.replace("$", "").replace(",", "")
                            asset_data["purchase_price"] = float(cleaned)
                        except:
                            pass
                    elif target == "purchase_date":
                        try:
                            # Try to parse date - basic fallback, in real app use dateparser
                            asset_data["purchase_date"] = pd.to_datetime(val_str).date()
                        except:
                            pass
                    elif target == "vendor":
                        asset_data["vendor"] = val_str
                    elif target == "order_number":
                        asset_data["order_number"] = val_str
                    elif target == "status":
                        s_val = val_str.lower()
                        
                        status_synonyms = {
                            "deployed": "active",
                            "in storage": "in_stock",
                            "in-stock": "in_stock",
                            "under repair": "fix",
                            "broken": "broken",
                            "damaged": "broken",
                            "retired": "retired",
                            "lost": "lost",
                            "stolen": "lost",
                            "awaiting disposal": "disposal",
                            "disposal": "disposal",
                            "reserved": "reserved",
                            "ordered": "ordered"
                        }
                        
                        if s_val in status_map:
                            asset_data["status_id"] = status_map[s_val]
                        elif s_val in status_synonyms and status_synonyms[s_val] in status_map:
                             asset_data["status_id"] = status_map[status_synonyms[s_val]]
                        elif "active" in status_map:
                             asset_data["status_id"] = status_map["active"]
                    elif target == "asset_type_id":
                         t_val = val_str.lower()
                         if t_val in type_map:
                             asset_data["asset_type_id"] = type_map[t_val]
                         else:
                             # Create new type on the fly? Or just log? 
                             # User asked to "pull existing fields then try to match them", 
                             # but "Category" is "Type". If type doesn't exist, maybe create it?
                             # For now, let's create it if missing to be helpful.
                             new_type = AssetType(name=val_str)
                             db.add(new_type)
                             await db.flush() # get ID
                             type_map[t_val] = new_type.id
                             asset_data["asset_type_id"] = new_type.id
                    else:
                        # Metadata
                        # If explicit mapping says "extra.something" or just no target
                        asset_data["extra"][k] = v
                
                # User Mapping
                # if 'Owner' in record and record['Owner'] in options['user_map']: ...
                
                asset = Asset(**asset_data)
                db.add(asset)
                imported_count += 1
                
            except Exception as e:
                # Don't break the whole import for one row error, just log it
                errors.append(f"Row {i}: {str(e)}")
                logger.warning(f"Import row {i} failed: {str(e)}")
                
        await db.commit()
        
        return {
            "success": True,
            "imported": imported_count,
            "errors": errors,
            "set_id": str(asset_set_id) if asset_set_id else None
        }
    except ValidationException:
        raise
    except Exception as e:
         logger.error(f"Import execution fatal error: {str(e)}", exc_info=True)
         raise AppException(f"Import process failed: {str(e)}")

@log_activity
async def execute_user_import(
    db: AsyncSession,
    job_id: UUID,
    strategy: str, # "NEW_SET", "EXISTING_SET", "GLOBAL"
    options: Dict[str, Any],
    user_id: UUID
) -> Dict[str, Any]:
    job = await get_job(db, job_id)
    file_path = job.payload.get("file_path")
    if not file_path:
         raise ValidationException("Invalid job payload: missing file_path")

    try:
        df = _read_file(file_path)
        df = df.where(pd.notnull(df), None)
        records = df.to_dict(orient="records")
        
        asset_set_id = None
        
        # Handle Strategies
        if strategy == "NEW_SET":
            set_name = options.get("new_set_name", f"Imported User Group {uuid.uuid4().hex[:8]}")
            # We use AssetSet for user grouping as per plan (reusing the model for now or just generic grouping concept if we had UserSet, but plan says AssetSet)
            # Actually, the user clarified: "assign these users to an Asset Set"
            new_set = AssetSet(name=set_name, created_by_id=user_id, description="User Group") 
            db.add(new_set)
            await db.flush()
            asset_set_id = new_set.id
            
        elif strategy == "EXISTING_SET":
            asset_set_id = options.get("asset_set_id")
            if not asset_set_id:
                raise ValidationException("asset_set_id is required for EXISTING_SET strategy")
                
        # GLOBAL strategy implies asset_set_id = None
        
        imported_count = 0
        errors = []
        
        # Prepare mapping
        field_mapping = options.get("mapping", {})
        def _normalize_header(h: str) -> str:
            s = (h or "").lower().strip()
            s = re.sub(r"[^a-z0-9]+", "_", s)
            return re.sub(r"_+", "_", s).strip("_")

        field_mapping = {str(k): v for k, v in field_mapping.items()}
        field_mapping = {_normalize_header(k): v for k, v in field_mapping.items()}
        
        for i, record in enumerate(records):
            try:
                email = None
                full_name = None
                role_name = "user"
                extra_data = {}
                
                for k, v in record.items():
                    k_norm = _normalize_header(k)
                    val_str = str(v) if v is not None and str(v).strip() != "" else None
                    
                    target = field_mapping.get(k_norm)
                    if not target:
                         if k_norm in ["email", "email_address", "mail"]: target = "email"
                         elif k_norm in ["name", "full_name", "fullname"]: target = "full_name"
                         elif k_norm in ["role", "role_name"]: target = "role"
                    
                    if target == "email":
                        if val_str: email = val_str
                    elif target == "full_name":
                        if val_str: full_name = val_str
                    elif target == "role":
                        if val_str: role_name = val_str
                    else:
                        if v is not None:
                            extra_data[k] = v

                if not email:
                     raise ValidationException("Email is required")
                
                # Check for existing user
                res = await db.execute(select(User).where(User.email == email))
                existing_user = res.scalar_one_or_none()
                
                user_data = {
                    "email": email,
                    "full_name": full_name,
                    "asset_set_id": asset_set_id,
                    "extra": extra_data
                }
                
                if existing_user:
                    # Update existing
                    existing_user.asset_set_id = asset_set_id
                    if existing_user.extra:
                        existing_user.extra.update(user_data["extra"])
                    else:
                        existing_user.extra = user_data["extra"]
                    if full_name:
                        existing_user.full_name = full_name
                else:
                    # Create new user
                    new_user = User(**user_data)
                    
                    # Handle Role
                    if role_name:
                         from app.models.role import Role
                         res_role = await db.execute(select(Role).where(Role.name == role_name))
                         role_obj = res_role.scalar_one_or_none()
                         if role_obj:
                             new_user.roles = [role_obj]
                    
                    db.add(new_user)
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
                logger.warning(f"User import row {i} failed: {str(e)}")
        
        await db.commit()
        
        return {
            "success": True,
            "imported": imported_count,
            "errors": errors,
            "set_id": str(asset_set_id) if asset_set_id else None
        }

    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"User import execution fatal error: {str(e)}", exc_info=True)
        raise AppException(f"User import process failed: {str(e)}")

@log_activity
async def execute_import_background_wrapper(
    job_id: UUID, 
    strategy: str, 
    options: Dict[str, Any], 
    user_id: UUID,
    type: str = "asset"
):
    from app.core.db import async_session_factory
    from sqlalchemy import select
    from app.models.job import Job, JobStatus

    async with async_session_factory() as db:
        try:
            # Update status to running
            res = await db.execute(select(Job).where(Job.id == job_id))
            job = res.scalar_one_or_none()
            if job:
                job.status = JobStatus.running
                await db.commit()
            
            # Execute logic
            result = None
            if type == "user":
                result = await execute_user_import(db, job_id, strategy, options, user_id)
            else:
                result = await execute_import(db, job_id, strategy, options, user_id)
            
            # Update job with result
            # Need to re-fetch job as execute_import might have committed/expired sessions
            res = await db.execute(select(Job).where(Job.id == job_id))
            job = res.scalar_one_or_none()
            if job:
                job.status = JobStatus.completed
                job.result = result
                await db.commit()
                
        except Exception as e:
            logger.error(f"Background import failed: {str(e)}", exc_info=True)
            # Update job with error
            try:
                # New transaction attempt for error logging
                res = await db.execute(select(Job).where(Job.id == job_id))
                job = res.scalar_one_or_none()
                if job:
                    job.status = JobStatus.failed
                    job.error = str(e)
                    await db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update job status to failed: {str(inner_e)}")

@log_activity
async def get_job(db: AsyncSession, job_id: UUID) -> Job:
    res = await db.execute(select(Job).where(Job.id == job_id))
    job = res.scalar_one_or_none()
    if not job:
        # If job is not found, it might be a transient issue or race condition.
        # However, for imports initiated via API, it should exist.
        # Logging specific error
        logger.warning(f"Job with id {job_id} not found in DB")
        raise ResourceNotFound(f"Job with id {job_id} not found")
    return job
