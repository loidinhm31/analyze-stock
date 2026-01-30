import { ReactNode, useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Spinner } from "@/components/atoms";
import { cn } from "@/lib/utils";

export interface DropZoneProps {
  onFileDrop: (file: File) => void;
  accept?: string;
  isProcessing?: boolean;
  processingText?: string;
  dropText?: string;
  defaultText?: string;
  subText?: string;
  buttonText?: string;
  buttonIcon?: ReactNode;
  className?: string;
}

export function DropZone({
  onFileDrop,
  accept = ".csv",
  isProcessing = false,
  processingText = "Processing file...",
  dropText = "Drop your file here",
  defaultText = "Drag & drop your file",
  subText = "or tap to select file",
  buttonText = "Choose File",
  buttonIcon,
  className,
}: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileDrop(file);
      }
    },
    [onFileDrop],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileDrop(file);
      }
    },
    [onFileDrop],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        backgroundColor: isDragActive ? "#EEF2FF" : "#FFFFFF",
        borderColor: isDragActive ? "#635BFF" : "#E5E7EB",
      }}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 sm:p-12 text-center cursor-pointer",
        "transition-colors duration-200 hover:border-[#635BFF]",
        isProcessing && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="hidden"
        id="file-upload"
        disabled={isProcessing}
      />

      <label
        htmlFor="file-upload"
        className="flex flex-col items-center gap-3 sm:gap-4 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Spinner size="lg" />
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {processingText}
            </p>
          </>
        ) : (
          <>
            <Upload
              className="h-10 w-10 sm:h-12 sm:w-12"
              style={{ color: "#6B7280" }}
            />
            <div>
              <p
                className="text-base sm:text-lg font-medium font-heading"
                style={{ color: "#111827" }}
              >
                {isDragActive ? dropText : defaultText}
              </p>
              <p
                className="text-xs sm:text-sm mt-1 sm:mt-2"
                style={{ color: "#6B7280" }}
              >
                {subText}
              </p>
            </div>
            <Button variant="outline" type="button" className="mt-3 sm:mt-4">
              {buttonIcon}
              {buttonText}
            </Button>
          </>
        )}
      </label>
    </div>
  );
}
