import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, Plus, ChevronDown, Download, RefreshCw, X,
  GitBranch, Eye, Check, ArrowUpRight
} from 'lucide-react';
import Papa from 'papaparse';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

export default function Registry() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Global Search


  // Advanced Parameters
  const [activeParams, setActiveParams] = useState({});
  const [paramMenuOpen, setParamMenuOpen] = useState(false);
  const paramRef = useRef(null);



  const CATEGORIES = {
    "Agent Metadata": [
      { key: 'agent_id', label: 'Agent ID' },
      { key: 'agent_name', label: 'Agent Name' },
      { key: 'source_repo_id', label: 'Source Repo ID' },
      { key: 'owner', label: 'Owner' },
      { key: 'authorized_by', label: 'Authorized By' },
      { key: 'subscription_plan', label: 'Subscription Plan' },
      { key: 'contributor', label: 'Contributor' },
    ],
    "Agent Operations & Network Logs": [
      { key: 'session_id', label: 'Session ID' },
      { key: 'used_by', label: 'Used By' },
      { key: 'action', label: 'Action' },
      { key: 'duration_min', label: 'Duration (Min)' },
      { key: 'files_altered', label: 'Files Altered' },
      { key: 'recipient', label: 'Recipient' },
      { key: 'item', label: 'Shared Item' },
      { key: 'comm_classification', label: 'Data Classification' },
      { key: 'is_confidential', label: 'Is Confidential' },
      { key: 'location_path', label: 'Location Path' },
      { key: 'encryption_status', label: 'Encryption Status' },
    ],
    "Repository Profile (SQL)": [
      { key: 'repo_id', label: 'Repo ID' },
      { key: 'repo_name', label: 'Repo Name' },
      { key: 'repo_link', label: 'Repo Link' },
      { key: 'repo_classification', label: 'Repo Classification' },
      { key: 'repo_confidence', label: 'Repo Confidence' },
    ],
    "Repository Intelligence (NoSQL)": [
      { key: 'repo_agent_signals', label: 'Agent Signals' },
      { key: 'repo_evidence_files', label: 'Evidence Files' },
      { key: 'repo_frameworks_detected', label: 'Frameworks Detected' },
      { key: 'repo_reasoning', label: 'Reasoning' }
    ]
  };

  const COLUMNS_CATEGORIES = {
    "Agent Metadata(SQL)": [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'source_repo_id', label: 'Source Repo ID' },
      { key: 'owner', label: 'Owner' },
    ],
    "Agent Operations & Network Logs(NoSQL)": [
      { key: 'session_id', label: 'Session ID' },
      { key: 'used_by', label: 'Used By' },
      { key: 'action', label: 'Action' },
      { key: 'files_altered', label: 'Files Altered' },
      { key: 'recipient', label: 'Recipient' },
      { key: 'item', label: 'Shared Item' },
      { key: 'comm_classification', label: 'Data Classification' },
      { key: 'encryption_status', label: 'Encryption Status' },
    ],
    "Repository Profile (SQL)": [
      { key: 'repo_id', label: 'Repo ID' },
      { key: 'repo_name', label: 'Repo Name' },
      { key: 'repo_link', label: 'Repo Link' },
      { key: 'repo_classification', label: 'Repo Classification' },
      { key: 'repo_confidence', label: 'Repo Confidence' },
    ],
    "Repository Intelligence (NoSQL)": [
      { key: 'repo_agent_signals', label: 'Agent Signals' },
      { key: 'repo_frameworks_detected', label: 'Frameworks' },
      { key: 'repo_reasoning', label: 'Reasoning' }
    ]
  };

  const initialColumns = {};
  Object.values(COLUMNS_CATEGORIES).flat().forEach(col => {
    initialColumns[col.key] = ['id', 'name', 'repo_id', 'repo_link', 'repo_classification', 'repo_agent_signals', 'repo_reasoning'].includes(col.key);
  });

  const [visibleColumns, setVisibleColumns] = useState(initialColumns);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnRef = useRef(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (paramRef.current && !paramRef.current.contains(event.target)) setParamMenuOpen(false);
      if (columnRef.current && !columnRef.current.contains(event.target)) setColumnMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRegistryData = useCallback(async (force = false) => {
    if (!hasSearched && !force) return;
    setLoading(true);
    if (force) setHasSearched(true);
    try {
      const params = new URLSearchParams();

      Object.entries(activeParams).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value.trim());
        }
      });

      const response = await api.get(`/agents?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch registry data', error);
      toast.error('Failed to fetch registry data');
    } finally {
      setLoading(false);
    }
  }, [activeParams, hasSearched]);

  const handleParamToggle = (key) => {
    setActiveParams(prev => {
      const next = { ...prev };
      if (key in next) delete next[key];
      else next[key] = '';
      return next;
    });
  };

  const handleCategorySelectAllParams = (catName) => {
    setActiveParams(prev => {
      const next = { ...prev };
      const keys = CATEGORIES[catName].map(p => p.key);
      const allSelected = keys.every(k => k in next);
      if (allSelected) {
        keys.forEach(k => delete next[k]);
      } else {
        keys.forEach(k => {
          if (!(k in next)) next[k] = '';
        });
      }
      return next;
    });
  };

  const handleCategorySelectAllColumns = (catName) => {
    setVisibleColumns(prev => {
      const next = { ...prev };
      const keys = COLUMNS_CATEGORIES[catName].map(c => c.key);
      const allSelected = keys.every(k => next[k]);
      keys.forEach(k => next[k] = !allSelected);
      return next;
    });
  };

  const handleParamValueChange = (key, val) => {
    setActiveParams(prev => ({ ...prev, [key]: val }));
  };

  const toggleColumn = (col) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const clearAll = () => {
    setActiveParams({});
    setGlobalSearch('');
    setHasSearched(false);
    setData([]);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    if (Array.isArray(val)) {
      if (val.length === 0) return '—';
      return val.join(', ');
    }
    return val;
  };

  const buildFlatData = (item) => {
    const sql = item.sql_data || {};
    const nosql = item.nosql_data || {};
    const r_sql = item.repo_sql_data || {};
    const r_nosql = item.repo_nosql_data || {};
    const nosql_logs = nosql.telemetry_logs || [];

    return {
      id: sql.agent_id,
      name: sql.agent_name,
      source_repo_id: sql.source_repo_id,
      owner: sql.owner,

      session_id: [...new Set(nosql_logs.map(l => l.event?.session_id).filter(Boolean))].join(', '),
      used_by: [...new Set(nosql_logs.map(l => l.event?.used_by).filter(Boolean))].join(', '),
      action: [...new Set(nosql_logs.map(l => l.event?.action).filter(Boolean))].join(', '),
      files_altered: [...new Set(nosql_logs.flatMap(l => l.event?.files_altered || []).filter(Boolean))].join(', '),
      recipient: [...new Set(nosql_logs.map(l => l.recipient).filter(Boolean))].join(', '),
      item: [...new Set(nosql_logs.flatMap(l => (l.data_shared || []).map(d => d.item)).filter(Boolean))].join(', '),
      comm_classification: [...new Set(nosql_logs.flatMap(l => (l.data_shared || []).map(d => d.classification)).filter(Boolean))].join(', '),
      encryption_status: [...new Set(nosql_logs.flatMap(l => (l.data_shared || []).map(d => d.encryption_status)).filter(Boolean))].join(', '),

      repo_id: r_sql.repo_id,
      repo_name: r_sql.repo_name,
      repo_link: r_sql.repo_link,
      repo_classification: r_sql.classification,
      repo_confidence: r_sql.confidence,
      repo_agent_signals: (r_nosql.agent_signals || []).join('; '),
      repo_frameworks_detected: (r_nosql.frameworks_detected || []).join('; '),
      repo_reasoning: r_nosql.reasoning
    };
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Determine which columns to export based on visibility
    const exportColumns = Object.entries(COLUMNS_CATEGORIES)
      .flatMap(([_, cols]) => cols)
      .filter(col => visibleColumns[col.key]);

    const headers = exportColumns.map(col => col.label);

    const rows = data.map(item => {
      const flatData = buildFlatData(item);

      return exportColumns.map(col => {
        const val = flatData[col.key] || '—';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'registry_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export successful');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-primary" />
            Registry
          </h2>
          <p className="text-foreground/60 mt-1">
            Unified view of registered agents and NoSQL audit metadata.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6 flex flex-col gap-4">
        {/* Top row: Column Menu + Search / Clear Actions */}
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative" ref={paramRef}>
              <button
                onClick={() => setParamMenuOpen(!paramMenuOpen)}
                className="px-4 py-2 bg-background border border-border rounded-md hover:bg-foreground/5 font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Parameter <ChevronDown className="w-4 h-4" />
              </button>

              {paramMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-md shadow-xl z-50 p-2 max-h-[60vh] overflow-y-auto">
                  {Object.entries(CATEGORIES).map(([catName, params]) => {
                    const allSelected = params.every(p => p.key in activeParams);
                    return (
                      <div key={catName} className="mb-2">
                        <div
                          className="flex items-center justify-between px-3 py-1.5 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                          onClick={() => handleCategorySelectAllParams(catName)}
                        >
                          <span className="text-xs font-bold text-foreground/70 uppercase">{catName}</span>
                          {allSelected ? <Check className="w-3 h-3 text-primary" /> : <span className="text-[10px] text-foreground/40">Select All</span>}
                        </div>
                        {params.map(p => (
                          <button
                            key={p.key}
                            onClick={() => handleParamToggle(p.key)}
                            className="w-full text-left px-4 py-1.5 text-sm rounded-md hover:bg-foreground/5 flex items-center justify-between mt-1"
                          >
                            <span>{p.label}</span>
                            {(p.key in activeParams) && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative" ref={columnRef}>
              <button
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                className="px-4 py-2 bg-background border border-border rounded-md hover:bg-foreground/5 font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4" /> Columns <ChevronDown className="w-4 h-4" />
              </button>

              {columnMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-md shadow-xl z-50 p-2 max-h-[60vh] overflow-y-auto">
                  {Object.entries(COLUMNS_CATEGORIES).map(([catName, cols]) => {
                    const allSelected = cols.every(c => visibleColumns[c.key]);
                    return (
                      <div key={catName} className="mb-2">
                        <div
                          className="flex items-center justify-between px-3 py-1.5 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                          onClick={() => handleCategorySelectAllColumns(catName)}
                        >
                          <span className="text-xs font-bold text-foreground/70 uppercase">{catName}</span>
                          {allSelected ? <Check className="w-3 h-3 text-primary" /> : <span className="text-[10px] text-foreground/40">Select All</span>}
                        </div>
                        {cols.map(c => (
                          <button
                            key={c.key}
                            onClick={() => toggleColumn(c.key)}
                            className="w-full text-left px-4 py-1.5 text-sm rounded-md hover:bg-foreground/5 flex items-center justify-between mt-1"
                          >
                            <span className="capitalize">{c.label}</span>
                            {visibleColumns[c.key] && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => fetchRegistryData(true)}
              className="px-4 py-2 bg-primary text-[#121212] rounded-md hover:bg-primary/90 font-medium text-sm flex items-center gap-2 transition-colors border border-transparent"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            
            <button
              onClick={() => fetchRegistryData(true)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 font-medium text-sm flex items-center gap-2 transition-colors border border-border"
            >
              <Eye className="w-4 h-4" /> Show All
            </button>
          </div>

          {/* Right side */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-background text-foreground/70 rounded-md hover:text-foreground font-medium text-sm flex items-center gap-2 transition-colors border border-border"
            >
              <X className="w-4 h-4" /> Clear All
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-primary text-[#121212] rounded-md hover:bg-primary/90 font-medium text-sm flex items-center gap-2 transition-colors border border-transparent"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>

          </div>
        </div>

        {/* Dynamic Parameter Inputs */}
        {Object.keys(activeParams).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2 pt-4 border-t border-border">
            {Object.keys(activeParams).map(key => {
              const paramDef = Object.values(CATEGORIES).flat().find(p => p.key === key);
              return (
                <div key={key} className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">{paramDef?.label}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={activeParams[key]}
                      onChange={(e) => handleParamValueChange(key, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchRegistryData(true)}
                      className="w-full pl-3 pr-8 py-1.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      placeholder={`Enter ${paramDef?.label.toLowerCase()}...`}
                    />
                    <button
                      onClick={() => handleParamToggle(key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 dark:bg-card border-b border-border">
              <tr>
                {Object.entries(COLUMNS_CATEGORIES).map(([cat, cols]) => {
                  const visibleCount = cols.filter(c => visibleColumns[c.key]).length;
                  if (visibleCount === 0) return null;
                  return (
                    <th key={cat} colSpan={visibleCount} className="p-2 border-b border-r border-border text-center font-bold text-[10px] uppercase bg-muted/80 dark:bg-card text-foreground tracking-wider last:border-r-0">
                      {cat}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {Object.entries(COLUMNS_CATEGORIES).map(([cat, cols]) => (
                  cols.filter(c => visibleColumns[c.key]).map(col => (
                    <th key={col.key} className="p-4 font-semibold text-xs text-foreground/70 border-r border-border last:border-r-0 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-foreground/50">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                    Loading registry data...
                  </td>
                </tr>
              ) : !hasSearched ? (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-foreground/50">
                    Add parameters or click Show All to load data.
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-foreground/50">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const flatData = buildFlatData(item);

                  return (
                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                      {Object.entries(COLUMNS_CATEGORIES).map(([cat, cols]) => (
                        cols.filter(c => visibleColumns[c.key]).map(col => {
                          const val = flatData[col.key];

                          if (col.key === 'repo_link' && val) {
                            return (
                              <td key={col.key} className="p-4 max-w-[200px] truncate text-sm border-r border-border/50 last:border-r-0">
                                <a href={val} target="_blank" rel="noreferrer" className="text-foreground hover:underline">{val}</a>
                              </td>
                            );
                          }

                          if (col.key === 'repo_classification') {
                            return (
                              <td key={col.key} className="p-4 text-sm border-r border-border/50 last:border-r-0">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${val === 'AGENT' ? 'bg-red-100 text-red-800 border border-red-200' :
                                    val === 'POSSIBLE_AGENT' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                      'bg-green-100 text-green-800 border border-green-200'
                                  }`}>
                                  {val || 'UNKNOWN'}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} className={`p-4 max-w-[200px] truncate text-sm text-foreground/80 border-r border-border/50 last:border-r-0 ${['id', 'name', 'source_repo_id', 'repo_name'].includes(col.key) ? 'font-medium text-foreground' : ''
                              }`} title={formatValue(val)}>
                              {formatValue(val)}
                            </td>
                          );
                        })
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
