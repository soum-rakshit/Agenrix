import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Save, Search, Filter, ChevronDown, Upload } from "lucide-react";
import TagInput from "../components/ui/TagInput";
import api from "../api/axiosInstance";
import BulkImportModal from "../components/ui/BulkImportModal";

const EDITABLE_FIELDS = {
    core: [
        { id: "owner", label: "Owner" },
        { id: "agent_source", label: "Source" },
        { id: "authorized_by", label: "Authorized By" },
        { id: "subscription_plan", label: "Subscription Plan" },
    ],
    access: [
        { id: "tools", label: "Access: Tools" },
        { id: "files", label: "Access: Files" },
        { id: "data_nodes", label: "Access: Data Nodes" },
        { id: "apis", label: "Access: APIs" },
        { id: "servers", label: "Access: Servers" },
    ],
};

const ALL_EDITABLE_FIELDS = [
    ...EDITABLE_FIELDS.core,
    ...EDITABLE_FIELDS.access,
];

export default function UpdateAgent() {
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [searchName, setSearchName] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [agentFound, setAgentFound] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                filterRef.current &&
                !filterRef.current.contains(event.target)
            ) {
                setFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [visibleFields, setVisibleFields] = useState({
        owner: true,
        agent_source: true,
        authorized_by: false,
        subscription_plan: false,
        tools: true,
        files: false,
        data_nodes: false,
        apis: false,
        servers: false,
    });

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { isSubmitting },
    } = useForm();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchId.trim() && !searchName.trim()) return;

        setIsSearching(true);
        setAgentFound(false);

        try {
            const queryParams = new URLSearchParams();
            if (searchId.trim())
                queryParams.append("agent_id", searchId.trim());
            if (searchName.trim())
                queryParams.append("agent_name", searchName.trim());

            const response = await api.get(`/agents?${queryParams.toString()}`);
            if (response.data && response.data.length > 0) {
                reset(response.data[0]);
                setSearchId(response.data[0].agent_id);
                setAgentFound(true);
                if (response.data.length > 1) {
                    toast.success(
                        `Found ${response.data.length} matching agents. Loaded the first one.`,
                    );
                } else {
                    toast.success("Agent details loaded");
                }
            } else {
                console.log("Agent not found");
            }
        } catch (error) {
            console.log(error.message || "Failed to fetch agent");
        } finally {
            setIsSearching(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            const payload = {};
            EDITABLE_FIELDS.core.forEach((field) => {
                if (visibleFields[field.id]) {
                    payload[field.id] = data[field.id];
                }
            });

            const access_rights = {};
            let hasAccessRightsUpdate = false;
            EDITABLE_FIELDS.access.forEach((field) => {
                if (visibleFields[field.id]) {
                    access_rights[field.id] =
                        data.access_rights?.[field.id] || [];
                    hasAccessRightsUpdate = true;
                }
            });

            if (hasAccessRightsUpdate) {
                payload.access_rights = access_rights;
            }

            await api.patch(`/update_agent/${searchId}`, payload);
            toast.success("Agent updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update agent");
        }
    };

    const toggleField = (id) => {
        setVisibleFields((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const allFieldsSelected = ALL_EDITABLE_FIELDS.every(
        (field) => visibleFields[field.id],
    );

    const toggleAllFields = () => {
        const newState = {};
        ALL_EDITABLE_FIELDS.forEach((field) => {
            newState[field.id] = !allFieldsSelected;
        });
        setVisibleFields(newState);
    };

    const toggleGroupFields = (groupKey) => {
        const isAllSelected = EDITABLE_FIELDS[groupKey].every(
            (field) => visibleFields[field.id],
        );
        const newState = { ...visibleFields };
        EDITABLE_FIELDS[groupKey].forEach((field) => {
            newState[field.id] = !isAllSelected;
        });
        setVisibleFields(newState);
    };

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-12">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">
                        Update Agent
                    </h2>
                    <p className="text-foreground/60 mt-1">
                        Search for an agent by ID or Name to update its
                        configuration and access rights.
                    </p>
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
                mode="update"
            />

            
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm mb-8">
                <form onSubmit={handleSearch} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Search Agent ID
                        </label>
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => {
                                setSearchId(e.target.value);
                                setSearchName("");
                            }}
                            placeholder="e.g. AGT-1000"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="flex items-center text-foreground/50 text-xs font-medium pb-3 uppercase">
                        OR
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Search Agent Name
                        </label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => {
                                setSearchName(e.target.value);
                                setSearchId("");
                            }}
                            placeholder="Claude Haiku"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="flex items-center gap-2 px-6 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors font-medium text-sm disabled:opacity-70 h-[38px]"
                    >
                        <Search className="w-4 h-4" />
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </form>
            </div>

            
            {agentFound && (
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-8 bg-card border border-border p-8 rounded-lg shadow-sm animate-in slide-in-from-bottom-4"
                >
                    <div className="flex justify-between items-center border-b border-border pb-4">
                        <h3 className="text-lg font-semibold text-foreground">
                            Agent Configuration
                        </h3>

                        <div className="relative" ref={filterRef}>
                            <button
                                type="button"
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md hover:bg-foreground/5 transition-colors text-xs font-medium"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Edit Fields
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {filterOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-md shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                                        <span className="text-sm font-semibold text-foreground">
                                            Visible Fields
                                        </span>
                                        <button
                                            onClick={toggleAllFields}
                                            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                                        >
                                            {allFieldsSelected
                                                ? "Deselect All"
                                                : "Select All"}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-semibold uppercase text-foreground/50">
                                                    Core Metadata
                                                </h4>
                                                <button
                                                    onClick={() =>
                                                        toggleGroupFields(
                                                            "core",
                                                        )
                                                    }
                                                    className="text-[10px] text-primary hover:underline"
                                                >
                                                    {EDITABLE_FIELDS.core.every(
                                                        (f) =>
                                                            visibleFields[f.id],
                                                    )
                                                        ? "None"
                                                        : "All"}
                                                </button>
                                            </div>
                                            {EDITABLE_FIELDS.core.map(
                                                (field) => (
                                                    <label
                                                        key={field.id}
                                                        className="flex items-center gap-2 mb-1 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                !!visibleFields[
                                                                    field.id
                                                                ]
                                                            }
                                                            onChange={() =>
                                                                toggleField(
                                                                    field.id,
                                                                )
                                                            }
                                                            className="rounded border-border bg-background text-primary"
                                                        />
                                                        <span className="text-sm">
                                                            {field.label}
                                                        </span>
                                                    </label>
                                                ),
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-semibold uppercase text-foreground/50">
                                                    Access Rights
                                                </h4>
                                                <button
                                                    onClick={() =>
                                                        toggleGroupFields(
                                                            "access",
                                                        )
                                                    }
                                                    className="text-[10px] text-primary hover:underline"
                                                >
                                                    {EDITABLE_FIELDS.access.every(
                                                        (f) =>
                                                            visibleFields[f.id],
                                                    )
                                                        ? "None"
                                                        : "All"}
                                                </button>
                                            </div>
                                            {EDITABLE_FIELDS.access.map(
                                                (field) => (
                                                    <label
                                                        key={field.id}
                                                        className="flex items-center gap-2 mb-1 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                !!visibleFields[
                                                                    field.id
                                                                ]
                                                            }
                                                            onChange={() =>
                                                                toggleField(
                                                                    field.id,
                                                                )
                                                            }
                                                            className="rounded border-border bg-background text-primary"
                                                        />
                                                        <span className="text-sm">
                                                            {field.label}
                                                        </span>
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-foreground/5 p-4 rounded-md border border-border/50">
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1">
                                    Agent ID (Read Only)
                                </label>
                                <input
                                    {...register("agent_id")}
                                    readOnly
                                    className="w-full bg-transparent border-none px-0 py-1 text-sm font-mono text-foreground focus:outline-none focus:ring-0 opacity-80"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1">
                                    Agent Name (Read Only)
                                </label>
                                <input
                                    {...register("agent_name")}
                                    readOnly
                                    className="w-full bg-transparent border-none px-0 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-0 opacity-80"
                                />
                            </div>
                        </div>

                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {visibleFields.owner && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Owner
                                    </label>
                                    <input
                                        {...register("owner")}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            )}

                            {visibleFields.agent_source && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Source
                                    </label>
                                    <input
                                        {...register("agent_source")}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            )}

                            {visibleFields.authorized_by && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Authorized By
                                    </label>
                                    <input
                                        {...register("authorized_by")}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            )}

                            {visibleFields.subscription_plan && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Subscription Plan
                                    </label>
                                    <input
                                        {...register("subscription_plan", {
                                            required:
                                                "Subscription Plan is required",
                                        })}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            )}
                        </div>

                        
                        <div className="space-y-4 pt-2">
                            {visibleFields.tools && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Access: Tools
                                    </label>
                                    <Controller
                                        control={control}
                                        name="access_rights.tools"
                                        render={({ field }) => (
                                            <TagInput
                                                value={field.value}
                                                onChange={(newValue) => {
                                                    const processedTags =
                                                        newValue
                                                            .flatMap((tag) =>
                                                                tag
                                                                    .replace(
                                                                        /["']/g,
                                                                        "",
                                                                    )
                                                                    .split(
                                                                        /[,]+/,
                                                                    ),
                                                            )
                                                            .map((tag) =>
                                                                tag.trim(),
                                                            )
                                                            .filter(
                                                                (tag) =>
                                                                    tag !== "",
                                                            );
                                                    field.onChange(
                                                        processedTags,
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {visibleFields.files && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Access: Files
                                    </label>
                                    <Controller
                                        control={control}
                                        name="access_rights.files"
                                        render={({ field }) => (
                                            <TagInput
                                                value={field.value}
                                                onChange={(newValue) => {
                                                    const processedTags =
                                                        newValue
                                                            .flatMap((tag) =>
                                                                tag
                                                                    .replace(
                                                                        /["']/g,
                                                                        "",
                                                                    )
                                                                    .split(
                                                                        /[,]+/,
                                                                    ),
                                                            )
                                                            .map((tag) =>
                                                                tag.trim(),
                                                            )
                                                            .filter(
                                                                (tag) =>
                                                                    tag !== "",
                                                            );
                                                    field.onChange(
                                                        processedTags,
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {visibleFields.data_nodes && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Access: Data Nodes
                                    </label>
                                    <Controller
                                        control={control}
                                        name="access_rights.data_nodes"
                                        render={({ field }) => (
                                            <TagInput
                                                value={field.value}
                                                onChange={(newValue) => {
                                                    const processedTags =
                                                        newValue
                                                            .flatMap((tag) =>
                                                                tag
                                                                    .replace(
                                                                        /["']/g,
                                                                        "",
                                                                    )
                                                                    .split(
                                                                        /[,]+/,
                                                                    ),
                                                            )
                                                            .map((tag) =>
                                                                tag.trim(),
                                                            )
                                                            .filter(
                                                                (tag) =>
                                                                    tag !== "",
                                                            );
                                                    field.onChange(
                                                        processedTags,
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {visibleFields.apis && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Access: APIs
                                    </label>
                                    <Controller
                                        control={control}
                                        name="access_rights.apis"
                                        render={({ field }) => (
                                            <TagInput
                                                value={field.value}
                                                onChange={(newValue) => {
                                                    const processedTags =
                                                        newValue
                                                            .flatMap((tag) =>
                                                                tag
                                                                    .replace(
                                                                        /["']/g,
                                                                        "",
                                                                    )
                                                                    .split(
                                                                        /[,]+/,
                                                                    ),
                                                            )
                                                            .map((tag) =>
                                                                tag.trim(),
                                                            )
                                                            .filter(
                                                                (tag) =>
                                                                    tag !== "",
                                                            );
                                                    field.onChange(
                                                        processedTags,
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {visibleFields.servers && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Access: Servers
                                    </label>
                                    <Controller
                                        control={control}
                                        name="access_rights.servers"
                                        render={({ field }) => (
                                            <TagInput
                                                value={field.value}
                                                onChange={(newValue) => {
                                                    const processedTags =
                                                        newValue
                                                            .flatMap((tag) =>
                                                                tag
                                                                    .replace(
                                                                        /["']/g,
                                                                        "",
                                                                    )
                                                                    .split(
                                                                        /[,]+/,
                                                                    ),
                                                            )
                                                            .map((tag) =>
                                                                tag.trim(),
                                                            )
                                                            .filter(
                                                                (tag) =>
                                                                    tag !== "",
                                                            );
                                                    field.onChange(
                                                        processedTags,
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-white rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? "Saving..." : "Update Agent"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
