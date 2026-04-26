import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Filter, ChevronDown, ChevronLeft, ChevronRight, Search, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axiosInstance'

const COLUMNS = {
  topLevel: [
    { id: 'agent_id', label: 'Agent ID' },
    { id: 'agent_name', label: 'Agent Name' },
    { id: 'owner', label: 'Owner' },
    { id: 'agent_source', label: 'Source' },
    { id: 'authorized_by', label: 'Authorized By' },
    { id: 'subscription_plan', label: 'Subscription Plan' },
    { id: 'contributors', label: 'Contributors' }
  ],
  accessRights: [
    { id: 'tools', label: 'Tools' },
    { id: 'files', label: 'Files' },
    { id: 'data_nodes', label: 'Data Nodes' },
    { id: 'apis', label: 'APIs' },
    { id: 'servers', label: 'Servers' }
  ],
  telemetry: [
    { id: 'files_altered', label: 'Files Altered' },
    { id: 'classification', label: 'Classification' },
    { id: 'is_confidential', label: 'Confidentiality' },
    { id: 'location_path', label: 'Location Path' },
    { id: 'encryption_status', label: 'Encryption Status' },
    { id: 'start_time', label: 'Start Time' },
    { id: 'end_time', label: 'End Time' }
  ]
};

const ALL_COLUMNS = [...COLUMNS.topLevel, ...COLUMNS.accessRights, ...COLUMNS.telemetry];

export default function DataExplorer() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchAgents = async (searchParams = {}) => {
    try {
      setIsLoading(true);
      const paramMap = {
        agent_id: 'agent_id',
        agent_name: 'agent_name',
        owner: 'owner',
        agent_source: 'agent_source',
        authorized_by: 'authorized_by',
        subscription_plan: 'subscription_plan',
        contributors: 'contributor',
        tools: 'tool',
        files: 'file',
        data_nodes: 'data_node',
        apis: 'api',
        servers: 'server'
      };

      const queryParams = new URLSearchParams();
      const telemetryParamKeys = [
        'start_time', 'end_time', 'files_altered', 'classification', 
        'is_confidential', 'location_path', 'encryption_status'
      ];
      const telemetryQueryParams = new URLSearchParams();

      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          const mappedKey = paramMap[key];
          if (mappedKey) {
            queryParams.append(mappedKey, value.trim());
          }
          if (telemetryParamKeys.includes(key)) {
            let backendKey = key;
            if (key === 'files_altered') backendKey = 'file_name';
            
            let finalValue = value.trim();
            if (key === 'start_time' || key === 'end_time') {
              const dateObj = new Date(finalValue);
              if (!isNaN(dateObj.getTime())) {
                finalValue = dateObj.toISOString();
              }
            }
            telemetryQueryParams.append(backendKey, finalValue);
          }
        }
      });

      const response = await api.get(`/agents?${queryParams.toString()}`);
      
      const telemetryQueryString = telemetryQueryParams.toString();

      const agentsWithActivity = await Promise.all(
        response.data.map(async (agent) => {
          try {
            const url = telemetryQueryString 
              ? `/get_agent_activity?agent_id=${agent.agent_id}&${telemetryQueryString}` 
              : `/get_agent_activity?agent_id=${agent.agent_id}`;
            const activityResponse = await api.get(url);
            return {
              ...agent,
              activities: activityResponse.data.data.activities || [],
              communications: activityResponse.data.data.communications || []
            };
          } catch (err) {
            return {
              ...agent,
              activities: [],
              communications: []
            };
          }
        })
      );

      const hasSpecificActivityFilter = ['files_altered'].some(key => searchParams[key] && searchParams[key].trim() !== '');
      const hasSpecificCommFilter = ['classification', 'is_confidential', 'encryption_status', 'location_path'].some(key => searchParams[key] && searchParams[key].trim() !== '');
      const hasTimeFilter = ['start_time', 'end_time'].some(key => searchParams[key] && searchParams[key].trim() !== '');
      const hasAnyTelemetryFilter = hasSpecificActivityFilter || hasSpecificCommFilter || hasTimeFilter;

      const filteredAgents = agentsWithActivity.filter(agent => {
        if (!hasAnyTelemetryFilter) return true;
        
        let hasActivities = agent.activities && agent.activities.length > 0;
        let hasComms = agent.communications && agent.communications.length > 0;

        const locPathSearch = searchParams['location_path']?.trim().toLowerCase();
        if (locPathSearch && hasComms) {
          hasComms = agent.communications.some(comm => 
            comm.data_shared?.some(data => data.location_path?.toLowerCase().includes(locPathSearch))
          );
        }
        
        if (hasSpecificActivityFilter && !hasActivities) return false;
        if (hasSpecificCommFilter && !hasComms) return false;
        if (!hasSpecificActivityFilter && !hasSpecificCommFilter && hasTimeFilter) {
          if (!hasActivities && !hasComms) return false;
        }

        return true;
      });

      setData(filteredAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendSearch = () => {
    setHasSearched(true);
    fetchAgents(searchValues);
    setCurrentPage(1);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchFilterDropdownOpen, setSearchFilterDropdownOpen] = useState(false);

  const columnsRef = useRef(null);
  const searchFilterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnsRef.current && !columnsRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
      if (searchFilterRef.current && !searchFilterRef.current.contains(event.target)) {
        setSearchFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [selectedColumns, setSelectedColumns] = useState({
    agent_id: true,
    agent_name: true,
    owner: true,
    agent_source: false,
    authorized_by: true,
    subscription_plan: true,
    contributors: false,
    tools: false,
    files: false,
    data_nodes: false,
    apis: false,
    servers: false,
    activity_logs: false,
    external_comms: false,
    files_altered: false,
    classification: false,
    is_confidential: false,
    location_path: false,
    encryption_status: false,
    start_time: false,
    end_time: false
  });

  const [activeSearchFields, setActiveSearchFields] = useState({});
  const [searchValues, setSearchValues] = useState({});

  const PAGE_SIZE = 10;

  const flattenData = (item) => {
    const flattened = {
      agent_id: item.agent_id,
      agent_name: item.agent_name,
      owner: item.owner,
      agent_source: item.agent_source,
      authorized_by: item.authorized_by,
      subscription_plan: item.subscription_plan,
      contributors: item.contributors,
    };

    Object.keys(COLUMNS.accessRights).forEach((_, i) => {
      const key = COLUMNS.accessRights[i].id;
      flattened[key] = item.access_rights?.[key]?.join(' | ') || '';
    });

    
    flattened.activity_logs = item.activities?.map(log => `${log.action} (${log.duration_min}m)`).join(' | ') || '';
    flattened.external_comms = item.communications?.map(comm => comm.recipient).join(' | ') || '';

    const allFiles = new Set();
    item.activities?.forEach(log => {
      log.files_altered?.forEach(f => allFiles.add(f));
    });
    flattened.files_altered = Array.from(allFiles).join(', ') || '';

    const classifications = new Set();
    const confidentialities = new Set();
    const encryptionStatuses = new Set();
    const locationPaths = new Set();
    
    item.communications?.forEach(comm => {
      comm.data_shared?.forEach(data => {
        if (data.classification) classifications.add(data.classification);
        if (data.is_confidential !== undefined) confidentialities.add(data.is_confidential ? 'Yes' : 'No');
        if (data.encryption_status) encryptionStatuses.add(data.encryption_status);
        if (data.location_path) locationPaths.add(data.location_path);
      });
    });
    
    flattened.classification = Array.from(classifications).join(', ') || '';
    flattened.is_confidential = Array.from(confidentialities).join(', ') || '';
    flattened.encryption_status = Array.from(encryptionStatuses).join(', ') || '';
    flattened.location_path = Array.from(locationPaths).join(', ') || '';
    
    let allTimestamps = [];
    item.activities?.forEach(log => {
      if (log.timestamp) allTimestamps.push(new Date(log.timestamp).getTime());
    });
    item.communications?.forEach(comm => {
      if (comm.timestamp) allTimestamps.push(new Date(comm.timestamp).getTime());
    });
    
    if (allTimestamps.length > 0) {
      const min = new Date(Math.min(...allTimestamps));
      const max = new Date(Math.max(...allTimestamps));
      flattened.start_time = min.toLocaleString();
      flattened.end_time = max.toLocaleString();
    } else {
      flattened.start_time = '';
      flattened.end_time = '';
    }

    return flattened;
  };

  const filteredData = data;

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const handleToggleColumn = (id) => {
    setSelectedColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSearchField = (id) => {
    setActiveSearchFields(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (!newState[id]) {
        setSearchValues(v => {
          return { ...v, [id]: '' };
        });
      }
      return newState;
    });
  };

  const toggleGroupColumns = (groupKey) => {
    const isAllSelected = COLUMNS[groupKey].every(col => selectedColumns[col.id]);
    const newState = { ...selectedColumns };
    COLUMNS[groupKey].forEach(col => {
      newState[col.id] = !isAllSelected;
    });
    setSelectedColumns(newState);
  };

  const toggleGroupSearchFields = (groupKey) => {
    const isAllSelected = COLUMNS[groupKey].every(col => activeSearchFields[col.id]);
    const newState = { ...activeSearchFields };
    COLUMNS[groupKey].forEach(col => {
      newState[col.id] = !isAllSelected;
    });
    setActiveSearchFields(newState);

    if (isAllSelected) {
      setSearchValues(prev => {
        const newVals = { ...prev };
        COLUMNS[groupKey].forEach(col => { newVals[col.id] = ''; });
        return newVals;
      });
      setCurrentPage(1);
    }
  };

  const allColumnsSelected = ALL_COLUMNS.every(col => selectedColumns[col.id]);
  const toggleAllColumns = () => {
    const newState = {};
    ALL_COLUMNS.forEach(col => {
      newState[col.id] = !allColumnsSelected;
    });
    setSelectedColumns(newState);
  };

  const allSearchFieldsSelected = ALL_COLUMNS.every(col => activeSearchFields[col.id]);
  const toggleAllSearchFields = () => {
    const newState = {};
    ALL_COLUMNS.forEach(col => {
      newState[col.id] = !allSearchFieldsSelected;
    });
    setActiveSearchFields(newState);

    if (allSearchFieldsSelected) {
      setSearchValues({});
      setCurrentPage(1);
    }
  };

  const downloadCSV = () => {
    const headersToExport = ALL_COLUMNS.filter(col => selectedColumns[col.id]);

    const rows = filteredData.map(item => {
      const flat = flattenData(item);
      return headersToExport.map(header => {
        const val = flat[header.id];
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const headerRow = headersToExport.map(h => `"${h.label}"`).join(',');
    const csvContent = [headerRow, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'agenrix_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeHeaders = ALL_COLUMNS.filter(col => selectedColumns[col.id]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Data Explorer</h2>
          <p className="text-foreground/60 mt-1">View, filter, and export agent telemetry and metadata.</p>
        </div>

        <div className="flex gap-3 relative">
          <button
            onClick={() => { setSearchOpen(!searchOpen); setFilterOpen(false); setSearchFilterDropdownOpen(false); }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors font-medium text-sm ${searchOpen ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:bg-foreground/5 text-foreground'}`}
          >
            <Search className="w-4 h-4" />
            Search
            <ChevronDown className="w-4 h-4" />
          </button>

          <div ref={columnsRef} className="relative">
            <button
              onClick={() => { setFilterOpen(!filterOpen); setSearchFilterDropdownOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors font-medium text-sm ${filterOpen ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:bg-foreground/5 text-foreground'}`}
            >
              <Filter className="w-4 h-4" />
              Columns
              <ChevronDown className="w-4 h-4" />
            </button>

            
            {filterOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-md shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                <span className="text-sm font-semibold text-foreground">Display Columns</span>
                <button
                  onClick={toggleAllColumns}
                  className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  {allColumnsSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold uppercase text-foreground/50">Core Metadata</h4>
                    <button onClick={() => toggleGroupColumns('topLevel')} className="text-[10px] text-primary hover:underline">
                      {COLUMNS.topLevel.every(col => selectedColumns[col.id]) ? 'None' : 'All'}
                    </button>
                  </div>
                  {COLUMNS.topLevel.map(col => (
                    <label key={col.id} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input type="checkbox" checked={!!selectedColumns[col.id]} onChange={() => handleToggleColumn(col.id)} className="rounded border-border bg-background text-primary" />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold uppercase text-foreground/50">Access Rights</h4>
                    <button onClick={() => toggleGroupColumns('accessRights')} className="text-[10px] text-primary hover:underline">
                      {COLUMNS.accessRights.every(col => selectedColumns[col.id]) ? 'None' : 'All'}
                    </button>
                  </div>
                  {COLUMNS.accessRights.map(col => (
                    <label key={col.id} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input type="checkbox" checked={!!selectedColumns[col.id]} onChange={() => handleToggleColumn(col.id)} className="rounded border-border bg-background text-primary" />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold uppercase text-foreground/50">Telemetry</h4>
                    <button onClick={() => toggleGroupColumns('telemetry')} className="text-[10px] text-primary hover:underline">
                      {COLUMNS.telemetry.every(col => selectedColumns[col.id]) ? 'None' : 'All'}
                    </button>
                  </div>
                  {COLUMNS.telemetry.map(col => (
                    <label key={col.id} className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input type="checkbox" checked={!!selectedColumns[col.id]} onChange={() => handleToggleColumn(col.id)} className="rounded border-border bg-background text-primary" />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-white rounded-md hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      
      {searchOpen && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm animate-in slide-in-from-top-2 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground">Advanced Search</h3>
            <div className="flex gap-2 items-center">
              <div className="relative" ref={searchFilterRef}>
                <button
                  onClick={() => setSearchFilterDropdownOpen(!searchFilterDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md hover:bg-foreground/5 transition-colors text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Parameter <ChevronDown className="w-3 h-3" />
                </button>
                {searchFilterDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-md shadow-2xl z-50 p-4 max-h-80 overflow-y-auto">
                    <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                      <span className="text-xs font-semibold uppercase text-foreground/50">Search Fields</span>
                      <button
                        onClick={toggleAllSearchFields}
                        className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        {allSearchFieldsSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold uppercase text-foreground/50">Core Metadata</h4>
                          <button onClick={() => toggleGroupSearchFields('topLevel')} className="text-[10px] text-primary hover:underline">
                            {COLUMNS.topLevel.every(col => activeSearchFields[col.id]) ? 'None' : 'All'}
                          </button>
                        </div>
                        {COLUMNS.topLevel.map(col => (
                          <label key={`search-${col.id}`} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!activeSearchFields[col.id]}
                              onChange={() => handleToggleSearchField(col.id)}
                              className="rounded border-border bg-background text-primary"
                            />
                            <span className="text-sm">{col.label}</span>
                          </label>
                        ))}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold uppercase text-foreground/50">Access Rights</h4>
                          <button onClick={() => toggleGroupSearchFields('accessRights')} className="text-[10px] text-primary hover:underline">
                            {COLUMNS.accessRights.every(col => activeSearchFields[col.id]) ? 'None' : 'All'}
                          </button>
                        </div>
                        {COLUMNS.accessRights.map(col => (
                          <label key={`search-${col.id}`} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!activeSearchFields[col.id]}
                              onChange={() => handleToggleSearchField(col.id)}
                              className="rounded border-border bg-background text-primary"
                            />
                            <span className="text-sm">{col.label}</span>
                          </label>
                        ))}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold uppercase text-foreground/50">Telemetry</h4>
                          <button onClick={() => toggleGroupSearchFields('telemetry')} className="text-[10px] text-primary hover:underline">
                            {COLUMNS.telemetry.every(col => activeSearchFields[col.id]) ? 'None' : 'All'}
                          </button>
                        </div>
                        {COLUMNS.telemetry.map(col => (
                          <label key={`search-${col.id}`} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!activeSearchFields[col.id]}
                              onChange={() => handleToggleSearchField(col.id)}
                              className="rounded border-border bg-background text-primary"
                            />
                            <span className="text-sm">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackendSearch}
                  className="px-3 py-1 bg-primary text-primary-foreground text-white rounded-md text-xs font-medium hover:bg-primary-hover transition-colors"
                >
                  Search
                </button>
                <button
                  onClick={() => { 
                    setActiveSearchFields({}); 
                    setSearchValues({}); 
                    setHasSearched(false);
                    setData([]);
                    setCurrentPage(1); 
                  }}
                  className="text-xs text-foreground/50 hover:text-foreground px-2 py-1"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(activeSearchFields).filter(key => activeSearchFields[key]).map(key => {
              const label = ALL_COLUMNS.find(c => c.id === key)?.label;
              return (
                <div key={key} className="flex flex-col gap-1 relative group">
                  <label className="text-xs font-medium text-foreground/70">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={key === 'start_time' || key === 'end_time' ? 'datetime-local' : 'text'}
                      value={searchValues[key] || ''}
                      onChange={(e) => {
                        setSearchValues(prev => ({ ...prev, [key]: e.target.value }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleBackendSearch();
                        }
                      }}
                      placeholder={key === 'start_time' || key === 'end_time' ? '' : `Search ${label}...`}
                      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => {
                        setActiveSearchFields(prev => ({ ...prev, [key]: false }));
                        setSearchValues(prev => ({ ...prev, [key]: '' }));
                      }}
                      className="text-foreground/40 hover:text-red-500 transition-colors"
                      title="Remove filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            {Object.keys(activeSearchFields).filter(key => activeSearchFields[key]).length === 0 && (
              <div className="text-sm text-foreground/50 italic col-span-full py-2">
                No search parameters added. Click "Add Parameter" to begin filtering the data.
              </div>
            )}
          </div>
        </div>
      )}

      {!hasSearched ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-lg shadow-sm p-12">
          <Search className="w-12 h-12 text-primary/40 mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">Ready to Search</h3>
          <p className="text-sm text-foreground/60 text-center max-w-md">
            Add parameters from the Advanced Search menu above and click "Search" to explore agent data.
          </p>
        </div>
      ) : (
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-foreground/5 border-b border-border text-foreground/80 font-medium">
                <tr>
                {activeHeaders.map(header => (
                  <th key={header.id} className="px-6 py-4">{header.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={activeHeaders.length} className="px-6 py-8 text-center text-foreground/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading agents data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => {
                  const flat = flattenData(item);
                  return (
                    <tr key={item.agent_id} className="hover:bg-foreground/5 transition-colors">
                      {activeHeaders.map(header => (
                        <td key={header.id} className="px-6 py-3 text-foreground/80">
                          {flat[header.id]}
                        </td>
                      ))}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={activeHeaders.length} className="px-6 py-8 text-center text-foreground/50">
                    No agents found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        
        <div className="p-4 border-t border-border flex items-center justify-between bg-foreground/5">
          <p className="text-sm text-foreground/60">
            Showing <span className="font-medium text-foreground">{filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, filteredData.length)}</span> of <span className="font-medium text-foreground">{filteredData.length}</span> results
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1 rounded border border-border bg-card disabled:opacity-50 hover:bg-foreground/5"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-border bg-card disabled:opacity-50 hover:bg-foreground/5"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
