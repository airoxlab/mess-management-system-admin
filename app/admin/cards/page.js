'use client';

import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MemberCard } from '@/components/Cards/MemberCard';
import { MemberCardPrint } from '@/components/Cards/MemberCardPrint';
import api from '@/lib/api-client';

export default function CardsPage() {
  const [members, setMembers] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [previewMember, setPreviewMember] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [generating, setGenerating] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load members and organization in parallel
      const [membersRes, orgRes] = await Promise.all([
        api.get('/api/members'),
        api.get('/api/organization'),
      ]);

      if (!membersRes.ok) throw new Error('Failed to load members');

      const membersData = await membersRes.json();
      setMembers(membersData.members || []);

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganization(orgData.organization);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (membersToPrint.length === 0) return;

    try {
      setGenerating(true);
      toast.loading('Generating PDF...', { id: 'pdf-generate' });

      // Wait for print component to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Make print container temporarily visible for capture
      const printContainer = printRef.current;
      if (!printContainer) {
        throw new Error('Print container not found');
      }

      // Get all card elements
      const cards = printContainer.querySelectorAll('.card');
      if (cards.length === 0) {
        throw new Error('No cards found to print');
      }

      // Card dimensions (credit card size in mm)
      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const margin = 10;
      const cardsPerRow = 2;
      const rowGap = 8;
      const colGap = 5;

      // Create PDF (A4 size)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate starting position to center cards
      const startX = (pageWidth - (cardsPerRow * cardWidth + (cardsPerRow - 1) * colGap)) / 2;
      const startY = margin;

      // Calculate cards per page based on available height
      const availableHeight = pageHeight - 2 * margin;
      const rowsPerPage = Math.floor((availableHeight + rowGap) / (cardHeight + rowGap));
      const cardsPerPage = cardsPerRow * rowsPerPage;

      // Temporarily show the container for html2canvas
      const originalStyle = printContainer.parentElement.style.cssText;
      printContainer.parentElement.style.cssText = 'position: absolute; left: -9999px; top: 0;';
      printContainer.parentElement.classList.remove('hidden');

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const positionOnPage = i % cardsPerPage;
        const col = positionOnPage % cardsPerRow;
        const row = Math.floor(positionOnPage / cardsPerRow);

        // Add new page if needed
        if (i > 0 && positionOnPage === 0) {
          pdf.addPage();
        }

        // Convert card to canvas
        const canvas = await html2canvas(card, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        // Calculate position
        const x = startX + col * (cardWidth + colGap);
        const y = startY + row * (cardHeight + rowGap);

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
      }

      // Restore hidden state
      printContainer.parentElement.style.cssText = originalStyle;
      printContainer.parentElement.classList.add('hidden');

      // Save the PDF
      const fileName = membersToPrint.length > 1
        ? `member-cards-${new Date().toISOString().split('T')[0]}.pdf`
        : `card-${membersToPrint[0].member_id}.pdf`;

      pdf.save(fileName);
      toast.success(`PDF downloaded: ${fileName}`, { id: 'pdf-generate' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + error.message, { id: 'pdf-generate' });
    } finally {
      setGenerating(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      member.name?.toLowerCase().includes(query) ||
      member.member_id?.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesType = typeFilter === 'all' || (member.member_type || 'student') === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all';

  const toggleMember = (member) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  const selectAll = () => {
    setSelectedMembers(filteredMembers);
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  const membersToPrint = selectedMembers.length > 0 ? selectedMembers : [previewMember].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Print Member Cards</h1>
          <p className="text-sm sm:text-base text-gray-500">Generate and print member ID cards</p>
        </div>
        <Button
          onClick={handleDownloadPDF}
          disabled={membersToPrint.length === 0 || generating}
          loading={generating}
          className="w-full sm:w-auto"
          icon={
            !generating && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          }
        >
          {generating ? 'Generating...' : `Download PDF (${membersToPrint.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left: Member Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Members</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="faculty">Faculty</option>
                  <option value="guest">Guest</option>
                </select>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    title="Clear filters"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No members found</p>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMembers.find((m) => m.id === member.id);
                  const isPreview = previewMember?.id === member.id;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isPreview
                          ? 'border-blue-500 bg-blue-50'
                          : isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setPreviewMember(member)}
                    >
                      <div className="flex items-center space-x-3">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{member.member_id}</span>
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                              member.member_type === 'staff' ? 'bg-blue-100 text-blue-700' :
                              member.member_type === 'faculty' ? 'bg-purple-100 text-purple-700' :
                              member.member_type === 'guest' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.member_type || 'student'}
                            </span>
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                              member.status === 'active' ? 'bg-green-100 text-green-700' :
                              member.status === 'suspended' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMember(member);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          }`}
                        >
                          {isSelected ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
              {selectedMembers.length} members selected
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Preview</h2>

            {previewMember ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <MemberCard
                    member={previewMember}
                    organization={organization}
                    className="transform scale-90 origin-top"
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{previewMember.name}</p>
                  <p className="text-xs text-gray-500">{previewMember.member_id}</p>
                </div>

                {selectedMembers.length > 0 && (
                  <p className="text-sm text-primary-600 text-center font-medium">
                    {selectedMembers.length} card(s) ready to print
                  </p>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Card Details</h3>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Standard credit card size (85.6mm × 53.98mm)</li>
                    <li>• QR code contains member ID</li>
                    <li>• Includes member photo (if uploaded)</li>
                    <li>• Shows contact, validity, and support info</li>
                    <li>• Print on thick paper or PVC card</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <p>Click on a member to preview their card</p>
                {selectedMembers.length > 0 && (
                  <p className="mt-2 text-sm text-primary-600 font-medium">
                    {selectedMembers.length} card(s) ready to print
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden print component */}
      <div className="hidden">
        <MemberCardPrint
          ref={printRef}
          members={membersToPrint}
          organization={organization}
        />
      </div>
    </div>
  );
}
