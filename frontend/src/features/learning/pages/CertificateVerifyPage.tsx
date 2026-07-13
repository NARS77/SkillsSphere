import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Award, CheckCircle, ShieldAlert, Calendar, User, BookOpen } from 'lucide-react';

export const CertificateVerifyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch certificate details from verification endpoint
  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ['verify-certificate', id],
    queryFn: async () => {
      const res = await api.get(`certificates/verify/${id}/`);
      return res.data;
    },
    enabled: !!id,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-xs text-slate-400 animate-pulse font-bold">Verifying certificate credentials with SkillSphere...</div>
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 border-rose-200 text-center space-y-6 bg-white dark:bg-slate-900 shadow-xl">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Verification Failed</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              The certificate credential ID you provided could not be verified by SkillSphere. This could be due to a revoked or invalid ID.
            </p>
          </div>
          <div className="pt-4 border-t">
            <Link to="/">
              <Button className="w-full">Return to Homepage</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex flex-col justify-center items-center p-6 space-y-6">
      
      {/* Verification status header */}
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-805 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
        <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
        <span>Officially Verified SkillSphere Credential</span>
      </div>

      {/* Landscape Certificate Canvas Display Card */}
      <Card className="max-w-4xl w-full p-10 md:p-14 border-brand-100 dark:border-brand-900/40 bg-white dark:bg-slate-900 relative shadow-2xl overflow-hidden rounded-3xl">
        
        {/* Certificate gold frame decoration borders */}
        <div className="absolute inset-4 border border-amber-500/20 rounded-2xl pointer-events-none" />
        <div className="absolute inset-5 border-2 border-amber-500/10 rounded-2xl pointer-events-none" />
        
        {/* Abstract watermark sphere background */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center justify-between">
          
          <div className="space-y-6 flex-1 text-center md:text-left">
            <div className="space-y-1">
              <span className="text-[10px] tracking-widest text-amber-600 font-extrabold uppercase">Certificate of Completion</span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {cert.course_title}
              </h1>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Awarded To</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-center md:justify-start gap-2">
                <User className="h-4 w-4 text-brand-500" />
                {cert.student_name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs max-w-sm mx-auto md:mx-0 border-t pt-4">
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold text-[9px] uppercase">Date Issued</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 justify-center md:justify-start">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(cert.issued_at).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold text-[9px] uppercase">Final Evaluation</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5 justify-center md:justify-start">
                  <BookOpen className="h-3.5 w-3.5" />
                  Grade {cert.grade_letter ?? 'Pass'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 shrink-0 text-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border">
            {/* Real QR image or default fallback mockup */}
            <div className="h-28 w-28 bg-white border p-2 rounded-xl">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} 
                alt="Verification QR" 
                className="h-full w-full"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-mono text-slate-400 block">UUID: {cert.certificate_id}</span>
              <span className="text-[9px] font-bold text-slate-500 block">Scan to verify this credential</span>
            </div>
          </div>

        </div>

        {/* Footer of certificate with branding */}
        <div className="mt-12 flex justify-between items-center text-[10px] text-slate-450 border-t pt-4 relative z-10">
          <span className="font-extrabold text-brand-600">SkillSphere Learning Platform</span>
          <span className="font-mono">Security Checksum: Verified</span>
        </div>

      </Card>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {cert.pdf_file && (
          <a href={cert.pdf_file} target="_blank" rel="noopener noreferrer" download>
            <Button size="lg" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Download PDF Copy
            </Button>
          </a>
        )}
        <Link to="/">
          <Button variant="outline" size="lg">
            Back to Home
          </Button>
        </Link>
      </div>

    </div>
  );
};
