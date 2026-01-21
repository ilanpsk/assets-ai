from sqlalchemy import Column, String, Boolean, Table, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.models.base import Base, TimestampMixin
from app.models.role import Role

user_role_table = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE")),
    Column("role_name", String, ForeignKey("role.name", ondelete="CASCADE")),
)

class User(Base, TimestampMixin):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Lifecycle
    employment_end_date = Column(Date, nullable=True)
    
    # New fields for import/grouping support
    asset_set_id = Column(UUID(as_uuid=True), ForeignKey("asset_set.id", ondelete="SET NULL"), nullable=True)
    extra = Column(JSONB, default=dict)

    roles = relationship(Role, secondary=user_role_table, lazy="selectin")

    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)

    def has_permission(self, permission_slug: str) -> bool:
        if self.has_role("admin"):
            return True
        for role in self.roles:
            for perm in role.permissions:
                if perm.slug == permission_slug:
                    return True
        return False

    @property
    def permissions(self) -> list[str]:
        perms = set()
        # If admin, technically has all, but for UI we rely on explicit grants or simple checks.
        # Since we seeded admin with all perms, this is fine.
        # But if we strictly use the code logic, admin bypasses checks.
        # For frontend, sending "admin" role is enough for some checks, but "permissions" are better.
        # Let's just gather what's in DB.
        for role in self.roles:
            for perm in role.permissions:
                perms.add(perm.slug)
        return list(perms)

    @classmethod
    async def get_by_id(cls, db, user_id):
        from sqlalchemy import select
        res = await db.execute(select(cls).where(cls.id == user_id))
        return res.unique().scalar_one_or_none()
