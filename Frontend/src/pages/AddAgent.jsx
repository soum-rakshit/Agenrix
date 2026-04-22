import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Upload } from 'lucide-react';
import TagInput from '../components/ui/TagInput';
import api from '../api/axiosInstance';
import BulkImportModal from '../components/ui/BulkImportModal';

export default function AddAgent() {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      agent_id: '',
      agent_name: '',
      agent_source: '',
      agent_description: '',
      owner: '',
      authorized_by:'',
      subscription_plan: '',
      contributors: [],
      access_rights: {
        tools: [],
        files: [],
        data_nodes: [],
        apis: [],
        servers: []
      }
    }
  });

  const onSubmit = async (data) => {
    try {
      // 1. Trigger loading state (optional, if you have a loading spinner)
      // setIsLoading(true);

      // 2. Make the POST request to your FastAPI backend
      // 'data' should match the AgentCreate schema (agent_id, agent_name, access_rights, etc.)
      const response = await api.post('/add_agent', data);

      // 3. Success Handling (FastAPI returns 200 or 201)
      if (response.status === 200 || response.status === 201) {
        toast.success('Agent created successfully!');
        reset(); // Clear the form
      }

    } catch (error) {
      // 4. Detailed Error Handling
      // If the backend returned a specific error (like 400 for duplicate ID)
      if (error.response) {
        const errorMessage = error.response.data.detail || 'Failed to create agent';
        toast.error(`Error: ${errorMessage}`);
      } else {
        // For network errors or server downtime
        toast.error('Server connection failed. Please check if the backend is running.');
      }
      console.error('Submission Error:', error);
    } finally {
      // setIsLoading(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Add New Agent</h2>
          <p className="text-foreground/60 mt-1">Register a new agent in the system and define access rights.</p>
        </div>
        <button 
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors font-medium text-sm"
        >
          <Upload className="w-4 h-4" />
          Bulk Upload (.csv)
        </button>
      </div>

      <BulkImportModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        mode="add"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card border border-border p-8 rounded-lg shadow-sm">

        {/* Core Metadata */}
        <div>
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">Core Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Agent ID</label>
              <input
                {...register('agent_id', { required: 'Agent ID is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. AuditBot Alpha"
              />
              {errors.agent_id && <p className="text-red-500 text-xs mt-1">{errors.agent_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Agent Name</label>
              <input
                {...register('agent_name', { required: 'Agent Name is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. AuditBot Alpha"
              />
              {errors.agent_name && <p className="text-red-500 text-xs mt-1">{errors.agent_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Source</label>
              <input
                {...register('agent_source', { required: 'Agent Source is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Github Url"
              />
              {errors.agent_source && <p className="text-red-500 text-xs mt-1">{errors.agent_source.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <input
                {...register('agent_description', { required: 'Agent Description is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Description of the agent"
              />
              {errors.agent_description && <p className="text-red-500 text-xs mt-1">{errors.agent_description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Owner</label>
              <input
                {...register('owner', { required: 'Owner is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Department Name"
              />
              {errors.owner && <p className="text-red-500 text-xs mt-1">{errors.owner.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Authorized by</label>
              <input
                {...register('authorized_by', { required: 'Authorized by is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder=""
              />
              {errors.authorized_by && <p className="text-red-500 text-xs mt-1">{errors.authorized_by.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subscription Plan</label>
              <input
                {...register('subscription_plan', { required: 'Subscription Plan is required' })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder=""
              />
              {errors.subscription_plan && <p className="text-red-500 text-xs mt-1">{errors.subscription_plan.message}</p>}
            </div>



            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contributors</label>
              <Controller
                control={control}
                name="contributors"
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    placeholder="Type server address and press enter..."
                    onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Access Rights */}
        <div>
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">Access Rights</h3>
          <div className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tools</label>
              <Controller
                control={control}
                name="access_rights.tools"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[\s,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }} placeholder="Type tool and press enter..." />
                )}
              />
              <p className="text-xs text-foreground/50 mt-1">Authorized execution tools (e.g., nmap, curl)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Files</label>
              <Controller
                control={control}
                name="access_rights.files"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[\s,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }} placeholder="Type file path and press enter..." />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data Nodes</label>
              <Controller
                control={control}
                name="access_rights.data_nodes"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[\s,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }} placeholder="Type data node and press enter..." />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">APIs</label>
              <Controller
                control={control}
                name="access_rights.apis"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[\s,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }} placeholder="Type API endpoint and press enter..." />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Servers</label>
              {/* <Controller
                control={control}
                name="access_rights.servers"
                render={({ field }) => (
                  <TagInput value={field.value} onChange={field.onChange} placeholder="Type server address and press enter..." />
                )}
              /> */}
              <Controller
                control={control}
                name="access_rights.servers"
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    placeholder="Type server address and press enter..."
                    onChange={(newValue) => {
                      // 1. If newValue is an array of strings (common for Tag components)
                      // We ensure each string in the array is split by commas or spaces
                      const processedTags = newValue
                        .flatMap(tag => tag.replace(/["']/g, "").split(/[\s,]+/)) // Split by space (\s) or comma (,)
                        .map(tag => tag.trim())              // Clean up whitespace
                        .filter(tag => tag !== "");          // Remove empty entries

                      // 2. Send the cleaned array back to React Hook Form
                      field.onChange(processedTags);
                    }}
                  />
                )}
              />
            </div>

          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-white rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Agent'}
          </button>
        </div>

      </form>
    </div>
  );
}
