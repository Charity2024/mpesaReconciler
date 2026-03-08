import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Download, 
  Search, 
  Copy, 
  Check, 
  FileText, 
  ArrowRightLeft,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MpesaRecord, ReconciliationResult } from './types';

const COLORS = {
  darkBlue: '#1e3a8a',
  silver: '#e5e7eb',
  lightGray: '#f3f4f6',
};

export default function App() {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [results, setResults] = useState<ReconciliationResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const paymentInputRef = useRef<HTMLInputElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'payment' | 'ticket') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'payment') setPaymentFile(file);
      else setTicketFile(file);
      setResults(null); // Reset results when new files are uploaded
    }
  };

  const parseFile = async (file: File): Promise<MpesaRecord[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

    const toRecords = (raw: MpesaRecord[]): MpesaRecord[] =>
      raw.filter(r => r.code != null && String(r.code).trim() !== '');

    if (file.name.endsWith('.csv')) {
      const hasHeader = lines[0].toLowerCase().includes('code') || lines[0].toLowerCase().includes('name');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      return toRecords(
        dataLines.map(line => {
          const idx = line.indexOf(',');
          const code = (idx >= 0 ? line.slice(0, idx) : line).trim();
          const name = idx >= 0 ? line.slice(idx + 1).trim() : undefined;
          return { code: code.toUpperCase(), name: name || undefined };
        })
      );
    } else {
      return toRecords(
        lines.map(line => {
          const parts = line.split(/[\s\t]+/).filter(p => p.trim() !== '');
          const code = parts[0]?.toUpperCase();
          const name = parts.slice(1).join(' ') || undefined;
          return { code: code ?? '', name };
        })
      );
    }
  };

  const compareLists = async () => {
    if (!paymentFile || !ticketFile) return;

    setIsComparing(true);
    // Simulate progress
    await new Promise(resolve => setTimeout(resolve, 800));

    const payments = await parseFile(paymentFile);
    const tickets = await parseFile(ticketFile);

    const paymentMap = new Map(payments.map(p => [p.code, p]));
    const ticketMap = new Map(tickets.map(t => [t.code, t]));

    const paymentCodes = new Set(payments.map(p => p.code));
    const ticketCodes = new Set(tickets.map(t => t.code));

    const missingTickets = payments.filter(p => !ticketCodes.has(p.code));
    const invalidTickets = tickets.filter(t => !paymentCodes.has(t.code));
    const validTickets = payments.filter(p => ticketCodes.has(p.code));

    setResults({
      payments,
      tickets,
      missingTickets,
      invalidTickets,
      validTickets
    });
    setIsComparing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportToCSV = (data: MpesaRecord[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Mpesa Code,Name\n"
      + data.map(r => `${r.code},${r.name || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTXT = (data: MpesaRecord[], filename: string) => {
    const txtContent = data.map(r => r.code).join("\n");
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredResults = useMemo(() => {
    if (!results) return null;
    const query = searchQuery.toUpperCase();
    return {
      missingTickets: results.missingTickets.filter(r => r.code.includes(query) || r.name?.toUpperCase().includes(query)),
      invalidTickets: results.invalidTickets.filter(r => r.code.includes(query)),
      validTickets: results.validTickets.filter(r => r.code.includes(query) || r.name?.toUpperCase().includes(query))
    };
  }, [results, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white py-8 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8" />
              M-Pesa Ticket Reconciler
            </h1>
            <p className="text-blue-100 mt-1 opacity-80">
              Reconcile payment transaction codes with generated tickets instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-full border border-white/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            System Ready
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* Upload Section */}
        {!results && (
          <div className="grid md:grid-cols-2 gap-8">
            <UploadCard
              title="Payment List"
              description="Upload the list of M-Pesa codes from the payment phone."
              file={paymentFile}
              onUpload={(e) => handleFileUpload(e, 'payment')}
              onRemove={() => {
                setPaymentFile(null);
                paymentInputRef.current && (paymentInputRef.current.value = '');
              }}
              inputRef={paymentInputRef}
            />
            <UploadCard
              title="Ticket List"
              description="Upload the list of M-Pesa codes used to generate tickets."
              file={ticketFile}
              onUpload={(e) => handleFileUpload(e, 'ticket')}
              onRemove={() => {
                setTicketFile(null);
                ticketInputRef.current && (ticketInputRef.current.value = '');
              }}
              inputRef={ticketInputRef}
            />
          </div>
        )}

        {/* Action Button */}
        {!results && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={compareLists}
              disabled={!paymentFile || !ticketFile || isComparing}
              className={`
                px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center gap-3
                ${!paymentFile || !ticketFile || isComparing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#1e3a8a] text-white hover:bg-blue-800 active:scale-95'}
              `}
            >
              {isComparing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Comparing Lists...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  Compare Lists
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Dashboard */}
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Payments" value={results.payments.length} icon={<FileText className="text-blue-600" />} />
              <StatCard label="Tickets Generated" value={results.tickets.length} icon={<CheckCircle2 className="text-green-600" />} />
              <StatCard label="Valid Tickets" value={results.validTickets.length} icon={<CheckCircle2 className="text-emerald-600" />} />
              <StatCard label="Missing Tickets" value={results.missingTickets.length} icon={<AlertCircle className="text-orange-600" />} />
              <StatCard label="Invalid Tickets" value={results.invalidTickets.length} icon={<XCircle className="text-red-600" />} />
            </div>

            {/* Search and Reset */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Search M-Pesa code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={() => {
                  setResults(null);
                  setPaymentFile(null);
                  setTicketFile(null);
                  setSearchQuery('');
                  paymentInputRef.current && (paymentInputRef.current.value = '');
                  ticketInputRef.current && (ticketInputRef.current.value = '');
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear and Start Over
              </button>
            </div>

            {/* Detailed Tables */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Missing Tickets Table */}
              <TableSection 
                title="Paid but No Ticket" 
                subtitle="People who paid but haven't received their tickets."
                data={filteredResults?.missingTickets || []}
                type="missing"
                onExportCSV={() => exportToCSV(results.missingTickets, 'missing_tickets')}
                onExportTXT={() => exportToTXT(results.missingTickets, 'missing_tickets')}
                copyToClipboard={copyToClipboard}
                copiedCode={copiedCode}
              />

              {/* Invalid Tickets Table */}
              <TableSection 
                title="Ticket but No Payment" 
                subtitle="Tickets generated with codes that don't exist in the payment list."
                data={filteredResults?.invalidTickets || []}
                type="invalid"
                onExportCSV={() => exportToCSV(results.invalidTickets, 'invalid_tickets')}
                onExportTXT={() => exportToTXT(results.invalidTickets, 'invalid_tickets')}
                copyToClipboard={copyToClipboard}
                copiedCode={copiedCode}
              />

              {/* Valid Tickets Table */}
              <TableSection 
                title="Valid Tickets" 
                subtitle="Successfully matched payments and tickets."
                data={filteredResults?.validTickets || []}
                type="valid"
                className="lg:col-span-2"
                onExportCSV={() => exportToCSV(results.validTickets, 'valid_tickets')}
                onExportTXT={() => exportToTXT(results.validTickets, 'valid_tickets')}
                copyToClipboard={copyToClipboard}
                copiedCode={copiedCode}
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} M-Pesa Ticket Reconciler. All processing happens locally in your browser.</p>
      </footer>
    </div>
  );
}

function UploadCard({ title, description, file, onUpload, onRemove, inputRef }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center text-center group hover:border-blue-300 transition-all">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${file ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
        {file ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-[240px]">{description}</p>
      
      {file ? (
        <div className="w-full space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="text-sm font-medium truncate text-gray-700">{file.name}</span>
            </div>
            <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove file" title="Remove file">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 px-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-medium hover:bg-gray-100 hover:border-blue-200 transition-all"
        >
          Select File (CSV/TXT)
        </button>
      )}
      <input
        type="file"
        ref={inputRef}
        onChange={onUpload}
        accept=".csv,.txt"
        className="hidden"
        aria-label={`Select ${title} file (CSV or TXT)`}
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
      <div className="mb-2">{icon}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function TableSection({ title, subtitle, data, type, className = "", onExportCSV, onExportTXT, copyToClipboard, copiedCode }: any) {
  const getHeaderColor = () => {
    switch(type) {
      case 'missing': return 'border-orange-500';
      case 'invalid': return 'border-red-500';
      case 'valid': return 'border-emerald-500';
      default: return 'border-blue-500';
    }
  };

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className}`}>
      <div className={`p-6 border-b border-gray-100 border-t-4 ${getHeaderColor()}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onExportCSV}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Export as CSV"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={onExportTXT}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              title="Export as TXT"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto max-h-[400px]">
        {data.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase tracking-wider font-bold text-gray-400">
              <tr>
                <th className="px-6 py-3 border-b border-gray-100">M-Pesa Code</th>
                {type !== 'invalid' && <th className="px-6 py-3 border-b border-gray-100">Name</th>}
                <th className="px-6 py-3 border-b border-gray-100 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((record: MpesaRecord, idx: number) => (
                <tr key={record.code + idx} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700">{record.code}</td>
                  {type !== 'invalid' && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.name || <span className="text-gray-300 italic">No name provided</span>}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => copyToClipboard(record.code)}
                      className={`p-1.5 rounded-md transition-all ${copiedCode === record.code ? 'bg-green-100 text-green-600' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                      {copiedCode === record.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-20 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">No records found</p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between items-center">
        <span>Showing {data.length} records</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
