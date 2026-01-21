import { useState } from 'react';
import { 
  BookOpen, Monitor, Users, Package, ClipboardList, FileText, 
  Settings, ShieldCheck, Database, Upload, Sparkles, LayoutDashboard,
  Search, Tag, List, Boxes, ChevronRight, CheckCircle2, Lightbulb,
  Zap, Bot, GitBranch, Timer, HardDrive, Layers, ArrowUpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const FeatureCard = ({ icon, title, description, badge }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  badge?: string;
}) => (
  <div className="group relative bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground">{title}</h4>
          {badge && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const TipCard = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 my-4">
    <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-amber-900 dark:text-amber-100">{children}</div>
  </div>
);

const sections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <BookOpen className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Welcome to <span className="font-semibold text-foreground">Assets AI</span> – your intelligent IT asset management platform. 
          This guide will help you understand all the features and get the most out of the system.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<LayoutDashboard className="h-5 w-5 text-primary" />}
            title="Mission Control Dashboard"
            description="Your central hub with customizable widgets showing asset statistics, health status, recent activity, and quick actions."
          />
          <FeatureCard
            icon={<Monitor className="h-5 w-5 text-primary" />}
            title="Asset Management"
            description="Track hardware, software, and any IT assets with detailed information, custom fields, and assignment tracking."
          />
          <FeatureCard
            icon={<Bot className="h-5 w-5 text-primary" />}
            title="AI Assistant"
            description="Chat with Nexus AI to manage assets, run queries, generate reports, and automate tasks using natural language."
            badge="AI Powered"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Role-Based Access"
            description="Granular permissions system with customizable roles to control who can view, edit, or manage different parts of the system."
          />
        </div>

        <TipCard>
          <strong>Quick Start:</strong> Begin by exploring the Dashboard to see your asset overview. 
          Then head to Assets to add your first items, or use the Import feature to bulk-load existing data.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          The Mission Control dashboard provides an at-a-glance view of your entire IT infrastructure with customizable widgets.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Available Widgets</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Boxes className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Total Assets</p>
              <p className="text-xs text-muted-foreground">Overall count of all managed assets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <HardDrive className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium text-sm">Total Value</p>
              <p className="text-xs text-muted-foreground">Combined purchase value of assets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-sm">Available / In Use</p>
              <p className="text-xs text-muted-foreground">Assets ready to deploy vs deployed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Timer className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-sm">Maintenance</p>
              <p className="text-xs text-muted-foreground">Assets currently under maintenance</p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Customization</h3>
        <p className="text-muted-foreground mb-4">
          Click <strong>"Customize View"</strong> to enter edit mode where you can:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            Drag and drop widgets to rearrange
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            Resize widgets by dragging corners
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            Add new widgets (statistics, charts, activity feeds)
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            Remove widgets you don't need
          </li>
        </ul>

        <TipCard>
          Your dashboard layout is saved automatically and persists across sessions.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'assets',
    title: 'Asset Management',
    icon: <Monitor className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          The Assets module is the heart of the system. Track any type of IT asset with rich metadata and custom fields.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Core Features</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Tag className="h-5 w-5 text-primary" />}
            title="Asset Types"
            description="Categorize assets as Laptops, Monitors, Servers, Software, etc. Create custom types in Settings."
          />
          <FeatureCard
            icon={<List className="h-5 w-5 text-primary" />}
            title="Asset Statuses"
            description="Track lifecycle with statuses like Available, In Use, Maintenance, Retired. Fully customizable."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Assignment Tracking"
            description="Assign assets to users with full history. See who has what and when it was assigned."
          />
          <FeatureCard
            icon={<Search className="h-5 w-5 text-primary" />}
            title="Powerful Search"
            description="Full-text search across all asset fields including custom fields. Filter by type, status, or user."
          />
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Asset Details</h3>
        <p className="text-muted-foreground mb-4">Each asset can store:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {['Name', 'Serial Number', 'Asset Type', 'Status', 'Location', 'Assigned User', 'Purchase Price', 'Purchase Date', 'Vendor', 'Order Number', 'Warranty End', 'Tags', 'Custom Fields'].map(field => (
            <div key={field} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {field}
            </div>
          ))}
        </div>

        <TipCard>
          <strong>Pro Tip:</strong> Use the bulk actions menu to update multiple assets at once – change status, 
          assign to user, or add tags to selected items.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'custom-fields',
    title: 'Custom Fields',
    icon: <Database className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Extend the system with custom fields to track any additional data specific to your organization.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Field Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">text</span>
            <p className="text-sm">Free-form text input</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">number</span>
            <p className="text-sm">Numeric values</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">date</span>
            <p className="text-sm">Date picker</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">checkbox</span>
            <p className="text-sm">Boolean yes/no</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Scoping Options</h3>
        <p className="text-muted-foreground mb-4">Custom fields can be scoped to:</p>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <Badge variant="secondary">Global</Badge>
            <span>Appears on all assets</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge variant="secondary">Asset Type</Badge>
            <span>Only shows for specific types (e.g., "RAM Size" only on Laptops)</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge variant="secondary">Asset Set</Badge>
            <span>Only shows for assets in a particular set</span>
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Promoting Metadata to Custom Fields</h3>
        <p className="text-muted-foreground mb-4">
          When you import data, any unmapped columns are stored as <strong>Additional Metadata</strong> on each asset. 
          This unstructured data is preserved but not searchable or reportable.
        </p>
        
        <div className="bg-gradient-to-br from-card to-muted/30 border border-border/50 rounded-xl p-5 my-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">The Promote Feature</h4>
              <p className="text-sm text-muted-foreground mb-3">
                On any asset's detail page, you'll see an <strong>"Additional Metadata"</strong> section showing 
                unstructured data from imports. Each field has a <strong>"Promote"</strong> button that converts 
                it into a proper custom field.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Creates a new custom field definition automatically
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Migrates the value from metadata to the new field
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Makes the data searchable and reportable
                </li>
              </ul>
            </div>
          </div>
        </div>

        <TipCard>
          <strong>Import Magic:</strong> When importing data, enable <strong>"Create missing fields"</strong> to automatically 
          turn unmapped spreadsheet columns into custom fields. Or import first, then selectively promote only the 
          metadata fields you actually need!
        </TipCard>
      </div>
    ),
  },
  {
    id: 'import',
    title: 'Data Import',
    icon: <Upload className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Bulk import assets or users from spreadsheets with intelligent column mapping and AI-powered suggestions.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Supported Formats</h3>
        <div className="flex gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm">.CSV</Badge>
          <Badge variant="outline" className="text-sm">.XLSX</Badge>
          <Badge variant="outline" className="text-sm">.XLS</Badge>
          <Badge variant="outline" className="text-sm">.JSON</Badge>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Import Wizard Steps</h3>
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <div>
              <p className="font-medium">Upload File</p>
              <p className="text-sm text-muted-foreground">Choose whether to import Assets or Users, then upload your file.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <div>
              <p className="font-medium">Analyze</p>
              <p className="text-sm text-muted-foreground">System scans headers and attempts automatic matching to system fields.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <div>
              <p className="font-medium">Map Fields</p>
              <p className="text-sm text-muted-foreground">Review mappings. AI suggestions show with a sparkle icon ✨. Adjust as needed.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
            <div>
              <p className="font-medium">Execute</p>
              <p className="text-sm text-muted-foreground">Choose to merge into existing data or create a new Asset Set.</p>
            </div>
          </li>
        </ol>

        <h3 className="text-lg font-semibold mt-6 mb-3">Import Strategies</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<GitBranch className="h-5 w-5 text-primary" />}
            title="Create New Asset Set"
            description="Import all assets into a new logical group. Great for department-specific inventories."
          />
          <FeatureCard
            icon={<Layers className="h-5 w-5 text-primary" />}
            title="Merge into Global"
            description="Add assets to the global pool. Existing assets with matching serials can be updated."
          />
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Handling Extra Data</h3>
        <p className="text-muted-foreground mb-4">
          Columns that aren't mapped to system fields can be handled two ways:
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Database className="h-5 w-5 text-primary" />}
            title="Auto-Create Fields"
            description="Enable 'Create missing fields' during import to automatically generate custom fields for all unmapped columns."
          />
          <FeatureCard
            icon={<ArrowUpCircle className="h-5 w-5 text-primary" />}
            title="Promote Later"
            description="Import as metadata first, then selectively promote individual fields from the asset detail page."
            badge="Flexible"
          />
        </div>

        <TipCard>
          <strong>Best Practice:</strong> If you're unsure what data you need, import everything as metadata first. 
          Then review individual assets and use the <strong>Promote</strong> button to convert only the fields you 
          actually want to track and search on.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'asset-sets',
    title: 'Asset Sets',
    icon: <Package className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Organize assets into logical collections called Asset Sets. Think of them as folders or categories for your inventory.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Use Cases</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Department Inventory"
            description="Group all Engineering, Marketing, or HR assets together for easy management."
          />
          <FeatureCard
            icon={<HardDrive className="h-5 w-5 text-primary" />}
            title="Project Equipment"
            description="Track assets assigned to specific projects or initiatives."
          />
          <FeatureCard
            icon={<Timer className="h-5 w-5 text-primary" />}
            title="Procurement Batches"
            description="Keep imported batches organized (e.g., 'Q1 2024 Laptops')."
          />
          <FeatureCard
            icon={<Boxes className="h-5 w-5 text-primary" />}
            title="Location-Based"
            description="Group assets by office, floor, or building."
          />
        </div>

        <TipCard>
          Assets can belong to multiple sets. Custom fields can be scoped to specific sets for specialized tracking.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'requests',
    title: 'Request Workflow',
    icon: <ClipboardList className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Handle IT service requests with a built-in ticketing system. Users can request new assets, 
          report issues with assigned equipment, or make general IT requests.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Request Types</h3>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge>New Asset</Badge>
            <p className="text-sm text-muted-foreground">Request for new equipment to be procured</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge>Assigned Asset</Badge>
            <p className="text-sm text-muted-foreground">Issue or question about currently assigned equipment</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge variant="outline">General</Badge>
            <p className="text-sm text-muted-foreground">Other IT support requests</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Request Lifecycle</h3>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Open</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge>In Progress</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">Closed</Badge>
        </div>

        <TipCard>
          Regular users see only their own requests. IT staff and admins can view and manage all requests.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: <Sparkles className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Nexus AI is your intelligent assistant for managing assets through natural conversation. 
          Click the bot icon in the bottom-right corner to start chatting.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">What You Can Do</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Search className="h-5 w-5 text-primary" />}
            title="Query Assets"
            description="'Show me all laptops assigned to Engineering' or 'What's the total value of our monitors?'"
            badge="Natural Language"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-primary" />}
            title="Perform Actions"
            description="'Create a new laptop asset with serial ABC123' or 'Assign asset X to John Smith'"
            badge="Hands-Free"
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5 text-primary" />}
            title="Generate Reports"
            description="'Give me a summary of assets by department' or 'List assets with warranty expiring this month'"
          />
          <FeatureCard
            icon={<Upload className="h-5 w-5 text-primary" />}
            title="Process Imports"
            description="Drag & drop a CSV file and ask the AI to import it with automatic field mapping."
            badge="File Upload"
          />
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Example Prompts</h3>
        <div className="space-y-2">
          {[
            "How many assets do we have in maintenance?",
            "Who has the most expensive laptop?",
            "Create a new Monitor asset named 'Dell U2723QE'",
            "Show assets purchased in the last 30 days",
            "What's our total IT asset value?",
          ].map((prompt, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
              <ChevronRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{prompt}</span>
            </div>
          ))}
        </div>

        <TipCard>
          The AI assistant requires an OpenAI or Google Gemini API key configured by your administrator. 
          Actions taken via AI are logged in the audit trail with an "AI" badge.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'reports',
    title: 'Reports & Audit',
    icon: <FileText className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Generate reports and review the complete audit trail of all system activities.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Audit Logging</h3>
        <p className="text-muted-foreground mb-4">Every action is automatically logged:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Asset creates, updates, and deletes
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            User assignments and unassignments
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Status changes and field modifications
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Import operations with record counts
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            AI-initiated actions (marked with AI badge)
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Report Types</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<HardDrive className="h-5 w-5 text-primary" />}
            title="Asset Reports"
            description="Inventory summaries, value reports, lifecycle analysis, depreciation schedules."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="User Reports"
            description="Assets per user, department distribution, assignment history."
          />
        </div>

        <TipCard>
          Audit logs show who made changes, what changed (with before/after values), and when. 
          Filter by user, entity type, action, or date range.
        </TipCard>
      </div>
    ),
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: <ShieldCheck className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          System administrators have access to advanced configuration options in the Admin panel.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Admin Sections</h3>
        <div className="grid gap-4">
          <FeatureCard
            icon={<Settings className="h-5 w-5 text-primary" />}
            title="General Settings"
            description="Configure system-wide settings, organization details, and default behaviors."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-primary" />}
            title="Integrations"
            description="Connect external services like LDAP/Active Directory, SSO providers, or third-party tools."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Access Control"
            description="Manage users, assign roles, and control system access."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Roles & Permissions"
            description="Create custom roles with granular permissions. Built-in roles: Admin, IT, User."
          />
          <FeatureCard
            icon={<Database className="h-5 w-5 text-primary" />}
            title="Snapshots"
            description="Create and restore point-in-time backups of your asset database."
          />
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Permission System</h3>
        <p className="text-muted-foreground mb-4">Permissions are organized by module:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {['asset:view_all', 'asset:create', 'asset:update', 'asset:delete', 'user:read', 'user:write', 'request:view_all', 'config:read', 'audit:read', 'role:manage'].map(perm => (
            <div key={perm} className="flex items-center gap-2 text-muted-foreground font-mono text-xs bg-muted/50 px-2 py-1 rounded">
              {perm}
            </div>
          ))}
        </div>

        <TipCard>
          Default roles cannot be deleted but their permissions can be modified. 
          Create custom roles for specialized access patterns like "Read-Only Auditor" or "Department Manager".
        </TipCard>
      </div>
    ),
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Configure asset statuses, types, and custom fields to match your organization's needs.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Configuration Options</h3>
        <div className="grid gap-4">
          <FeatureCard
            icon={<List className="h-5 w-5 text-primary" />}
            title="Asset Statuses"
            description="Define lifecycle states like 'Available', 'In Use', 'Maintenance', 'Retired'. One status is marked as default for new assets."
          />
          <FeatureCard
            icon={<Tag className="h-5 w-5 text-primary" />}
            title="Asset Types"
            description="Create categories for your assets. Examples: Laptop, Desktop, Monitor, Server, Software License, Phone."
          />
          <FeatureCard
            icon={<Database className="h-5 w-5 text-primary" />}
            title="Custom Fields"
            description="Add any extra data fields. Scope them globally or to specific types/sets."
          />
        </div>

        <TipCard>
          Changes to types and statuses take effect immediately. Deleting a type/status will not delete assets – 
          they'll keep their current value but you won't be able to set new assets to that value.
        </TipCard>
      </div>
    ),
  },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="h-full flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border/50 bg-muted/20 flex-shrink-0">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Documentation</h1>
              <p className="text-xs text-muted-foreground">Assets AI Guide</p>
            </div>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <nav className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {section.icon}
                {section.title}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto p-8 pb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {currentSection.icon}
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{currentSection.title}</h2>
            </div>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {currentSection.content}
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
