import { useCallback, useState } from "react";
import { FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/atoms";
import { DropZone } from "@/components/molecules";

export interface FileUploadProps {
  onFileProcess: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  onFileProcess,
  accept = ".csv",
  maxSizeMB = 10,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      if (!file.name.endsWith(".csv") && !file.type.includes("csv")) {
        setError("Please upload a CSV file");
        return;
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }

      setIsProcessing(true);

      try {
        await onFileProcess(file);
      } catch (err) {
        console.error("File processing error:", err);
        setError(err instanceof Error ? err.message : "Failed to process file");
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileProcess, maxSizeMB],
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:p-8">
      <DropZone
        onFileDrop={handleFile}
        accept={accept}
        isProcessing={isProcessing}
        processingText="Processing CSV file..."
        dropText="Drop your CSV file here"
        defaultText="Drag & drop your CSV file"
        subText="or tap to select file"
        buttonText="Choose File"
        buttonIcon={<FileText className="mr-2 h-4 w-4" />}
      />

      {error && (
        <Alert variant="destructive" className="mt-3 sm:mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
