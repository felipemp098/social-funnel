import * as React from "react";
import { cn } from "@/lib/utils";

const GlassTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table 
      ref={ref} 
      className={cn(
        "w-full caption-bottom text-sm",
        className
      )} 
      {...props} 
    />
  ),
);
GlassTable.displayName = "GlassTable";

const GlassTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead 
      ref={ref} 
      className={cn(
        "[&_tr]:border-b border-white/10",
        "backdrop-blur-sm",
        className
      )}
      style={{ backgroundColor: '#131316cc' }}
      {...props} 
    />
  ),
);
GlassTableHeader.displayName = "GlassTableHeader";

const GlassTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody 
      ref={ref} 
      className={cn(
        "[&_tr:last-child]:border-0",
        className
      )}
      style={{ backgroundColor: '#131316cc' }}
      {...props} 
    />
  ),
);
GlassTableBody.displayName = "GlassTableBody";

const GlassTableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot 
      ref={ref} 
      className={cn(
        "border-t border-white/10 bg-white/10 font-medium [&>tr]:last:border-b-0",
        "backdrop-blur-sm",
        className
      )} 
      {...props} 
    />
  ),
);
GlassTableFooter.displayName = "GlassTableFooter";

const GlassTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-white/10 transition-all duration-200",
        "hover:opacity-80 data-[state=selected]:opacity-90",
        "backdrop-blur-sm",
        className
      )}
      style={{ backgroundColor: '#131316cc' }}
      {...props}
    />
  ),
);
GlassTableRow.displayName = "GlassTableRow";

const GlassTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-white/80",
        "[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
GlassTableHead.displayName = "GlassTableHead";

const GlassTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        "text-white/90",
        className
      )} 
      {...props} 
    />
  ),
);
GlassTableCell.displayName = "GlassTableCell";

const GlassTableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption 
      ref={ref} 
      className={cn(
        "mt-4 text-sm text-white/70",
        className
      )} 
      {...props} 
    />
  ),
);
GlassTableCaption.displayName = "GlassTableCaption";

export { 
  GlassTable, 
  GlassTableHeader, 
  GlassTableBody, 
  GlassTableFooter, 
  GlassTableHead, 
  GlassTableRow, 
  GlassTableCell, 
  GlassTableCaption 
};
