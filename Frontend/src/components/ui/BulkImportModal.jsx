import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
    Upload,
    Download,
    X,
    Loader2,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import api from "../../api/axiosInstance";

export default function BulkImportModal({ isOpen, onClose, mode, onSuccess }) {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setProgress(0);
        setResults(null);
        setIsUploading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const downloadTemplate = () => {
        const headers = [
            "agent_id",
            "agent_name",
            "agent_source",
            "agent_description",
            "owner",
            "authorized_by",
            "subscription_plan",
            "contributors",
            "access_tools",
            "access_files",
            "access_data_nodes",
            "access_apis",
            "access_servers",
        ].join(",");

        const sampleRow = [
            "AGT-CSV-01",
            "Bulk Agent",
            "Internal",
            "Imported via CSV",
            "Alpha Team",
            "Jane Doe",
            "Pro",
            "alice|bob",
            "nmap|wireshark",
            "/etc/passwd",
            "DB-Main",
            "AuthService",
            "srv-01|srv-02",
        ].join(",");

        const csvContent = headers + "\n" + sampleRow;
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "agent_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (
            selectedFile.type !== "text/csv" &&
            !selectedFile.name.endsWith(".csv")
        ) {
            toast.error("Please upload a valid CSV file.");
            return;
        }

        setFile(selectedFile);
        setResults(null);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast.error("Error parsing CSV. Please check the format.");
                    console.error(results.errors);
                } else {
                    setParsedData(results.data);
                }
            },
        });
    };

    const parseArrayField = (str) => {
        if (!str) return [];
        return String(str)
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);
    };

    const constructPayload = (row) => {
        const payload = {
            owner: row.owner,
            agent_source: row.agent_source,
            authorized_by: row.authorized_by,
            subscription_plan: row.subscription_plan,
            contributors: parseArrayField(row.contributors),
            access_rights: {
                tools: parseArrayField(row.access_tools),
                files: parseArrayField(row.access_files),
                data_nodes: parseArrayField(row.access_data_nodes),
                apis: parseArrayField(row.access_apis),
                servers: parseArrayField(row.access_servers),
            },
        };

        if (mode === "add") {
            payload.agent_id = row.agent_id;
            payload.agent_name = row.agent_name;
            payload.agent_description = row.agent_description || "";
        }

        if (mode === "update") {
            Object.keys(payload).forEach((key) => {
                if (
                    payload[key] === undefined ||
                    payload[key] === null ||
                    payload[key] === ""
                ) {
                    delete payload[key];
                }
            });
        }

        return payload;
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setIsUploading(true);
        setProgress(0);

        let successCount = 0;
        let failCount = 0;

        const CHUNK_SIZE = 5;

        for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
            const chunk = parsedData.slice(i, i + CHUNK_SIZE);

            const promises = chunk.map(async (row) => {
                if (!row.agent_id) {
                    return { success: false, id: "Unknown (Missing ID)" };
                }

                try {
                    const payload = constructPayload(row);
                    if (mode === "add") {
                        await api.post("/add_agent", payload);
                    } else {
                        await api.patch(
                            `/update_agent/${row.agent_id}`,
                            payload,
                        );
                    }
                    return { success: true, id: row.agent_id };
                } catch (error) {
                    return { success: false, id: row.agent_id, error };
                }
            });

            const chunkResults = await Promise.all(promises);

            chunkResults.forEach((res) => {
                if (res.success) successCount++;
                else failCount++;
            });

            setProgress((prev) => prev + chunk.length);
        }

        setIsUploading(false);
        setResults({
            success: successCount,
            failed: failCount,
            total: parsedData.length,
        });

        if (failCount === 0) {
            toast.success(
                `Successfully ${mode === "add" ? "imported" : "updated"} ${successCount} agents!`,
            );
            if (onSuccess) onSuccess();
        } else {
            toast.error(
                `${successCount} succeeded, ${failCount} failed. Check console for details.`,
            );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-4xl rounded-lg shadow-xl border border-border flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Upload className="w-5 h-5 text-primary" />
                            Bulk {mode === "add" ? "Import" : "Update"} via CSV
                        </h2>
                        <p className="text-sm text-foreground/60 mt-1">
                            Upload a CSV file to process multiple agents at
                            once. Arrays should be pipe-separated (|).
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="text-foreground/50 hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Controls */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="px-4 py-2 bg-foreground text-background font-medium text-sm rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50"
                            >
                                Select CSV File
                            </button>
                            <span className="text-sm text-foreground/70">
                                {file ? file.name : "No file selected"}
                            </span>
                        </div>

                        <button
                            onClick={downloadTemplate}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download Template
                        </button>
                    </div>

                    {/* Results Summary */}
                    {results && (
                        <div
                            className={`p-4 rounded-md mb-6 flex items-start gap-3 ${results.failed > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}
                        >
                            {results.failed > 0 ? (
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            )}
                            <div>
                                <h4
                                    className={`font-medium ${results.failed > 0 ? "text-red-500" : "text-green-500"}`}
                                >
                                    Import Completed
                                </h4>
                                <p className="text-sm text-foreground/80 mt-1">
                                    Successfully{" "}
                                    {mode === "add" ? "added" : "updated"}{" "}
                                    {results.success} agents.{" "}
                                    {results.failed > 0 &&
                                        `${results.failed} failed.`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isUploading && (
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-medium text-foreground/70 mb-2">
                                <span>Processing...</span>
                                <span>
                                    {progress} / {parsedData.length}
                                </span>
                            </div>
                            <div className="w-full bg-foreground/10 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${(progress / parsedData.length) * 100}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedData.length > 0 && !results && (
                        <div className="border border-border rounded-md overflow-hidden">
                            <div className="bg-foreground/5 px-4 py-2 border-b border-border">
                                <h3 className="text-sm font-medium text-foreground">
                                    Preview ({parsedData.length} rows)
                                </h3>
                            </div>
                            <div className="overflow-x-auto max-h-64">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-foreground/60 uppercase bg-card sticky top-0 border-b border-border shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">
                                                ID
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Owner
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Source
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Tools
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {parsedData
                                            .slice(0, 10)
                                            .map((row, i) => (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-foreground/5 transition-colors"
                                                >
                                                    <td className="px-4 py-2 font-mono text-xs">
                                                        {row.agent_id}
                                                    </td>
                                                    <td className="px-4 py-2 truncate max-w-[150px]">
                                                        {row.agent_name || "-"}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {row.owner || "-"}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {row.agent_source ||
                                                            "-"}
                                                    </td>
                                                    <td className="px-4 py-2 truncate max-w-[150px]">
                                                        {row.access_tools ||
                                                            "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.length > 10 && (
                                <div className="text-center p-2 text-xs text-foreground/50 bg-card border-t border-border">
                                    Showing first 10 rows
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-foreground/5 rounded-b-lg">
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="px-4 py-2 font-medium text-sm text-foreground bg-background border border-border rounded-md hover:bg-foreground/5 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={
                            isUploading ||
                            parsedData.length === 0 ||
                            results !== null
                        }
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-white rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Confirm Import
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
