import React, { useEffect, useState } from 'react';
import { Mail, Search, MessageSquare, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await axiosClient.get('/contact/leads');
        setLeads(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch leads');
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-dark/50">
        <Loader2 className="animate-spin mr-2" size={24} />
        Loading leads...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-heading font-bold text-brand-dark mb-2">Contact Leads</h1>
          <p className="text-brand-dark/60">View and manage messages from the Contact Us page.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-brand-dark/50">
            <Mail className="mx-auto mb-4 opacity-50" size={48} />
            <p>No leads found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-offwhite text-brand-dark border-b border-brand-dark/10 text-sm uppercase tracking-wider font-semibold">
                  <th className="p-4 px-6">Name</th>
                  <th className="p-4 px-6">Email</th>
                  <th className="p-4 px-6">Message</th>
                  <th className="p-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-brand-dark/5 hover:bg-brand-offwhite/50 transition-colors">
                    <td className="p-4 px-6 font-medium text-brand-dark">{lead.name}</td>
                    <td className="p-4 px-6 text-brand-dark/80">
                      <a href={`mailto:${lead.email}`} className="text-brand-orange hover:underline">{lead.email}</a>
                    </td>
                    <td className="p-4 px-6 text-brand-dark/80 max-w-md truncate" title={lead.message}>
                      {lead.message}
                    </td>
                    <td className="p-4 px-6 text-brand-dark/60 text-sm">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeads;
