import { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, ArrowRight, Loader2, AlertCircle, 
  Settings2, Database, Users, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';

import { uploadImportFile, analyzeImport, executeImport, getJobStatus, getImportConfig, type ImportConfig } from '@/api/imports';

interface MappedField {
  header: string;
  key: string;
}

interface AnalysisResult {
  headers: string[];
  mapped_fields: MappedField[];
  suggested_mapping?: Record<string, string>;
  suggestions?: any[];
}

interface JobResult {
    imported: number;
    errors: string[];
}

interface JobStatus {
    status: string;
    result?: JobResult;
}

const STEPS = [
  { id: 'upload', label: 'Upload File', icon: Upload },
  { id: 'analyze', label: 'Analyze', icon: FileText },
  { id: 'map', label: 'Map Fields', icon: Settings2 },
  { id: 'execute', label: 'Execute', icon: Database },
  { id: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export default function Imports() {
  const [currentStep, setCurrentStep] = useState(0);
  const [importType, setImportType] = useState<'asset' | 'user'>('asset');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Mapping State
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importStrategy, setImportStrategy] = useState<string>('MERGE'); // MERGE, NEW_SET, EXISTING_SET
  const [newSetName, setNewSetName] = useState('');
  
  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  
  const [config, setConfig] = useState<ImportConfig | null>(null);

  useEffect(() => {
    getImportConfig().then(setConfig).catch(() => {
      // Fallback defaults if fetch fails
      setConfig({ allowed_extensions: ['.csv', '.xlsx', '.xls', '.json'], max_upload_mb: 50 });
    });
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      
      // Check size
      if (config?.max_upload_mb && selected.size > config.max_upload_mb * 1024 * 1024) {
        toast.error(`File too large. Maximum size is ${config.max_upload_mb}MB.`);
        e.target.value = ''; // Reset
        return;
      }
      
      // Check extension (basic)
      const ext = "." + selected.name.split('.').pop()?.toLowerCase();
      if (config?.allowed_extensions && !config.allowed_extensions.includes(ext)) {
         // Try checking mime type or just warn
         // Actually backend enforces this, but good UX to warn.
         // Let's rely on accept attribute for strictness, but if they bypass:
         if (!config.allowed_extensions.some(allowed => selected.name.toLowerCase().endsWith(allowed))) {
             toast.error(`Invalid file type. Allowed: ${config.allowed_extensions.join(', ')}`);
             e.target.value = '';
             return;
         }
      }

      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const res = await uploadImportFile(file);
      setJobId(res.job_id);
      setCurrentStep(1); // Move to Analyze
      toast.success('File uploaded successfully');
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jobId) return;
    
    setIsAnalyzing(true);
    try {
      // Pass useAi=true to enable semantic suggestions
      const res = await analyzeImport(jobId, importType, true);
      setAnalysis(res);
      
      // Pre-fill mapping with auto-detected fields
      const initialMapping: Record<string, string> = {};
      
      // 1. Exact/Deterministic matches
      res.mapped_fields.forEach((mf: MappedField) => {
        initialMapping[mf.header] = mf.key;
      });
      
      // 2. AI Suggestions (only if not already mapped)
      if (res.suggested_mapping) {
        Object.entries(res.suggested_mapping).forEach(([header, target]) => {
            if (!initialMapping[header]) {
                initialMapping[header] = target as string;
            }
        });
      }
      
      setFieldMapping(initialMapping);
      
      setCurrentStep(2); // Move to Mapping
    } catch {
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!jobId) return;
    
    setIsExecuting(true);
    try {
      const options = {
        mapping: fieldMapping,
        new_set_name: newSetName || undefined,
        // Add other options like create_missing_fields if needed
        create_missing_fields: true
      };
      
      await executeImport(jobId, {
        strategy: importStrategy,
        options,
        type: importType
      });
      
      setCurrentStep(3); // Move to Execution/Progress
      startPolling(jobId);
    } catch {
      toast.error('Execution failed to start');
      setIsExecuting(false);
    }
  };

  const startPolling = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(id);
        setJobStatus(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setPollingInterval(null);
          setIsExecuting(false);
          if (status.status === 'completed') {
            setCurrentStep(4); // Complete
            toast.success('Import completed!');
          } else {
            toast.error('Import failed with errors');
          }
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
    setPollingInterval(interval);
  };

  const getSystemFields = () => {
    if (importType === 'asset') {
      return [
        { value: 'name', label: 'Name' },
        { value: 'serial_number', label: 'Serial Number' },
        { value: 'asset_type_id', label: 'Asset Type' },
        { value: 'status', label: 'Status' },
        { value: 'location', label: 'Location' },
        { value: 'purchase_price', label: 'Purchase Price' },
        { value: 'purchase_date', label: 'Purchase Date' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'order_number', label: 'Order Number' },
        { value: 'warranty_end', label: 'Warranty End' },
        { value: 'assigned_user_id', label: 'Assigned User' },
        { value: 'tags', label: 'Tags' },
      ];
    } else {
      return [
        { value: 'email', label: 'Email' },
        { value: 'full_name', label: 'Full Name' },
        { value: 'role', label: 'Role' },
      ];
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Import Wizard</h1>
          <p className="text-muted-foreground">Bulk import assets or users from CSV/Excel files.</p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -z-10" />
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-background px-4">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 
                  ${isActive || isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground bg-background text-muted-foreground'}
                  transition-colors duration-300
                `}
              >
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium mt-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {/* Step 0: Upload & Type Selection */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select File & Type</CardTitle>
              <CardDescription>Choose what you want to import and upload your data file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`
                    border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 hover:bg-muted/50 transition-all
                    ${importType === 'asset' ? 'border-primary bg-primary/5' : 'border-border'}
                  `}
                  onClick={() => setImportType('asset')}
                >
                  <Database className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Import Assets</span>
                </div>
                <div 
                  className={`
                    border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 hover:bg-muted/50 transition-all
                    ${importType === 'user' ? 'border-primary bg-primary/5' : 'border-border'}
                  `}
                  onClick={() => setImportType('user')}
                >
                  <Users className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Import Users</span>
                </div>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">
                    {config ? config.allowed_extensions.join(', ') : 'CSV, Excel, or JSON'} files
                    {config?.max_upload_mb ? ` (Max ${config.max_upload_mb}MB)` : ''}
                  </p>
                </div>
                <Input 
                  type="file" 
                  accept={config?.allowed_extensions.join(',') || ".csv,.xlsx,.xls,.json"}
                  onChange={handleFileSelect}
                  className="max-w-xs"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload & Continue
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 1: Analysis */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>File Analysis</CardTitle>
              <CardDescription>Review detected columns before proceeding.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileText className="w-16 h-16 text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Ready to analyze "{file?.name}"</p>
              <p className="text-muted-foreground text-center max-w-md">
                We will scan the file headers and attempt to match them with system fields automatically.
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>Back</Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze File
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Mapping */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Mapping</CardTitle>
              <CardDescription>Map your file columns to system fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Import Strategy</h3>
                <RadioGroup value={importStrategy} onValueChange={setImportStrategy} className="grid grid-cols-2 gap-4">
                  {importType === 'asset' && (
                    <div 
                      className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setImportStrategy('NEW_SET')}
                    >
                      <RadioGroupItem value="NEW_SET" id="new_set" />
                      <Label htmlFor="new_set" className="cursor-pointer">Create New Asset Set</Label>
                    </div>
                  )}
                  <div 
                    className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setImportStrategy('MERGE')}
                  >
                    <RadioGroupItem value="MERGE" id="merge" />
                    <Label htmlFor="merge" className="cursor-pointer">Merge into Existing/Global</Label>
                  </div>
                </RadioGroup>

                {importStrategy === 'NEW_SET' && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label>New Set Name</Label>
                    <Input 
                      placeholder="e.g. Q1 Procurement" 
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Column Mapping</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {analysis?.headers.map((header: string) => {
                    const isMapped = !!fieldMapping[header];
                    // Check if this mapping came from AI suggestions
                    // Logic: It matches the suggestion AND wasn't in the strict "mapped_fields"
                    const isAI = analysis?.suggested_mapping?.[header] === fieldMapping[header] && 
                                 !analysis.mapped_fields.find(m => m.header === header);

                    return (
                      <div key={header} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5 text-sm font-medium truncate flex items-center gap-2" title={header}>
                          {header}
                          {isAI && (
                            <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                              <Sparkles className="w-3 h-3" /> AI
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="col-span-5">
                          <Select 
                            value={fieldMapping[header] || 'ignore'} 
                            onValueChange={(val) => setFieldMapping(prev => ({...prev, [header]: val === 'ignore' ? '' : val}))}
                          >
                            <SelectTrigger className={isMapped ? 'border-primary' : ''}>
                              <SelectValue placeholder="Ignore" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">-- Ignore --</SelectItem>
                              {getSystemFields().map(f => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                              {/* Add dynamic custom fields? */}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
              <Button onClick={handleExecute} disabled={isExecuting}>
                {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Import
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Execution Progress */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Importing Data...</CardTitle>
              <CardDescription>Please wait while we process your file.</CardDescription>
            </CardHeader>
            <CardContent className="py-10 space-y-6 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <p className="font-medium text-lg">Processing...</p>
                <p className="text-muted-foreground">This may take a moment depending on file size.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Completion Summary */}
        {currentStep === 4 && jobStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Import Complete
              </CardTitle>
              <CardDescription>Here is the summary of the operation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-primary">{jobStatus.result?.imported || 0}</p>
                  <p className="text-sm text-muted-foreground">Records Created</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl text-center">
                  <p className={`text-3xl font-bold ${(jobStatus.result?.errors?.length ?? 0) > 0 ? 'text-red-500' : 'text-primary'}`}>
                    {jobStatus.result?.errors?.length ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              {(jobStatus.result?.errors?.length ?? 0) > 0 && (
                <div className="border rounded-lg p-4 bg-red-50/10 border-red-200 dark:border-red-900">
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-red-600">
                    <AlertCircle className="w-4 h-4" /> Error Log
                  </h4>
                  <ScrollArea className="h-[150px]">
                    <ul className="text-sm space-y-1 text-red-600/80">
                      {jobStatus.result?.errors?.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setFile(null);
                setJobId(null);
                setCurrentStep(0);
                setFieldMapping({});
              }}>Import Another</Button>
              <Button onClick={() => window.location.href = '/assets'}>View Assets</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
