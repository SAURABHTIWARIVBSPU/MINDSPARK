'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Search,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Copy,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter,
  Users,
  Sparkles,
  CheckCircle2,
  X,
  Settings2,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Layers,
  Trophy,
  FileText,
  History,
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  MessageCircle,
  Share2,
  Eye,
  ShieldCheck,
  Flame,
  BarChart3,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Student,
  SystemSettings,
  WhatsAppStatus,
  CustomWhatsAppTemplate,
  WhatsAppCampaign,
  StudentMessageRecord,
  WhatsAppGroupLinkItem,
} from '@/types';
import {
  WHATSAPP_TEMPLATES,
  UNIVERSAL_TEMPLATES,
  OFFICIAL_COMPETITION_TEMPLATES,
  WHATSAPP_MERGE_TAGS,
  WhatsAppTemplateId,
  renderMessageTemplate,
  generateWhatsAppLink,
  isValidIndianMobile,
  buildStudentWhatsAppMessage,
  getCategoryGroupLink,
  OFFICIAL_COMPETITION_CATEGORIES,
  getAllAvailableTemplates,
  OFFICIAL_WHATSAPP_GROUPS,
  normalizeClassCategory,
  normalizeCompetitionCategory,
  resolveStudentWhatsAppGroup,
  getRecommendedTemplateForStudent,
} from '@/lib/whatsapp/message-builder';
import { normalizePhone } from '@/lib/excel/normalizer';

export default function WhatsAppPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'bulk' | 'groups' | 'templates' | 'history' | 'single' | 'broadcast' | 'categoryGroups' | 'testStaff' | 'config'>('bulk');

  // Dynamic WhatsApp Groups State (18 Official Communities)
  const [groups, setGroups] = useState<WhatsAppGroupLinkItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupFilterComp, setGroupFilterComp] = useState('ALL');
  const [groupFilterClass, setGroupFilterClass] = useState('ALL');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WhatsAppGroupLinkItem | null>(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormComp, setGroupFormComp] = useState('');
  const [groupFormClass, setGroupFormClass] = useState('All');
  const [groupFormUrl, setGroupFormUrl] = useState('');
  const [groupFormDesc, setGroupFormDesc] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [resettingGroups, setResettingGroups] = useState(false);

  // Bulk Desk: Class Category Filtering & Stats
  const [selectedClassCategory, setSelectedClassCategory] = useState('');
  const [availableClassCategories, setAvailableClassCategories] = useState<string[]>([
    'Play Group',
    'Nursery',
    'LKG',
    'UKG',
    '1',
    '2-3',
    '4-5',
    '6-8',
    '9-10',
    '11-12',
    'Graduation',
  ]);
  const [classCategoryStats, setClassCategoryStats] = useState<Record<string, { total: number; sent: number; pending: number; failed: number }>>({});

  // Competition Grouping Stats State
  const [competitionStats, setCompetitionStats] = useState<Record<string, { total: number; sent: number; pending: number; failed: number }>>({});

  // Dynamic Custom Templates State
  const [customTemplates, setCustomTemplates] = useState<CustomWhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplTitle, setTplTitle] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplCategory, setTplCategory] = useState('ALL');
  const [tplContent, setTplContent] = useState('');
  const [tplMetaName, setTplMetaName] = useState('admit_card_new');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Template Manager Filtering States
  const [templateTabType, setTemplateTabType] = useState<'ALL' | 'COMPETITIONS' | 'UNIVERSAL' | 'CUSTOM'>('ALL');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateFilterComp, setTemplateFilterComp] = useState('ALL');
  const [templateFilterClass, setTemplateFilterClass] = useState('ALL');

  // Controlled Message Repetition (Resend Mode)
  const [usePreviousTemplateForResend, setUsePreviousTemplateForResend] = useState(true);

  // Student Message History Modal State
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
  const [resendingStudentId, setResendingStudentId] = useState<string | null>(null);

  // Campaign Launcher Modal State
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignNameInput, setCampaignNameInput] = useState('');
  const [campaignTargetGroup, setCampaignTargetGroup] = useState('ALL');
  const [campaignTargetClass, setCampaignTargetClass] = useState('ALL');
  const [campaignTargetOfficialGroup, setCampaignTargetOfficialGroup] = useState('');
  const [campaignTargetTemplate, setCampaignTargetTemplate] = useState('REGISTRATION_CONFIRMATION');
  const [campaignProvider, setCampaignProvider] = useState<'icpaas' | 'cloud_api' | 'browser_queue_sync'>('icpaas');
  const [campaignOnlyUnsent, setCampaignOnlyUnsent] = useState(true);
  const [campaignConfirmed, setCampaignConfirmed] = useState(false);
  const [launchingCampaign, setLaunchingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ total: number; succeeded: number; failed: number; message?: string } | null>(null);

  // Category-wise WhatsApp Group Links State
  const [categoryLinks, setCategoryLinks] = useState<Record<string, string>>({});
  const [defaultGroupLink, setDefaultGroupLink] = useState<string>('https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L');
  const [savingCategoryLinks, setSavingCategoryLinks] = useState(false);

  // Test Staff & Teachers Registry State (Separate Excel)
  const [testStaffList, setTestStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffDesignation, setNewStaffDesignation] = useState('');
  const [newStaffSchool, setNewStaffSchool] = useState('');
  const [staffDispatching, setStaffDispatching] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Core Data
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    sentCount: 0,
    pendingCount: 0,
    invalidPhoneCount: 0,
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupStats, setGroupStats] = useState<Record<string, { total: number; sent: number; pending: number; failed: number; groupName: string; url: string }>>({});
  const [selectedSchool, setSelectedSchool] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_SENT' | 'SENT' | 'OPENED'>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [allMatchingStudents, setAllMatchingStudents] = useState<Student[]>([]);
  const [fetchingAll, setFetchingAll] = useState(false);

  // Message Template & Composer
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplateId>('REGISTRATION_CONFIRMATION');
  const [customText, setCustomText] = useState(WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION.defaultText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Single Mode Active Candidate
  const [singleStudent, setSingleStudent] = useState<Student | null>(null);

  // Queue Runner State
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [queueMode, setQueueMode] = useState<'step' | 'auto'>('step');
  const [queueIntervalSec, setQueueIntervalSec] = useState(5);
  const [queueCountdown, setQueueCountdown] = useState(5);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueCandidates, setQueueCandidates] = useState<Student[]>([]);
  const [queueSentCount, setQueueSentCount] = useState(0);
  const [queueSkippedCount, setQueueSkippedCount] = useState(0);
  const [queueFinished, setQueueFinished] = useState(false);

  // Bulk Cloud API dispatch state
  const [isCloudSending, setIsCloudSending] = useState(false);
  const [cloudSendSummary, setCloudSendSummary] = useState<string | null>(null);

  // Utility feedback
  const [copied, setCopied] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Meta WhatsApp Template & Variable Connector State (admit_card_new)
  const [metaTemplateName, setMetaTemplateName] = useState<string>('admit_card_new');
  const [metaTemplateLang, setMetaTemplateLang] = useState<string>('en');
  const [metaVariables, setMetaVariables] = useState<string[]>([
    'competitionTitle',
    'participantName',
    'enrollmentNotice',
    'admitCardInstructions',
    'groupLinkNotice',
  ]);

  // Load saved Meta template config from localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('mindspark_meta_template_name');
      if (savedName) setMetaTemplateName(savedName);
      const savedLang = localStorage.getItem('mindspark_meta_template_lang');
      if (savedLang) setMetaTemplateLang(savedLang);
      const savedVars = localStorage.getItem('mindspark_meta_template_vars');
      if (savedVars) setMetaVariables(JSON.parse(savedVars));
    } catch {}
  }, []);

  const saveMetaTemplateConfig = () => {
    try {
      localStorage.setItem('mindspark_meta_template_name', metaTemplateName);
      localStorage.setItem('mindspark_meta_template_lang', metaTemplateLang);
      localStorage.setItem('mindspark_meta_template_vars', JSON.stringify(metaVariables));
      setActionSuccessMsg('Meta WhatsApp Template & Variable mapping successfully saved!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (e: any) {
      alert(`Save error: ${e.message}`);
    }
  };

  // Fetch Test Teachers and Staff from separate Excel registry
  const fetchTestStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);
    try {
      const res = await fetch('/api/whatsapp/test-staff');
      if (res.ok) {
        const data = await res.json();
        setTestStaffList(data.staff || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'testStaff') {
      fetchTestStaff();
    }
  }, [activeTab, fetchTestStaff]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    try {
      const res = await fetch('/api/whatsapp/test-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: newStaffName,
          phone: newStaffPhone,
          designation: newStaffDesignation,
          school: newStaffSchool,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || 'Failed to add teacher');
        return;
      }
      setTestStaffList(data.staff || []);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffDesignation('');
      setNewStaffSchool('');
      setActionSuccessMsg('Teacher added successfully to Test Registry without duplicate!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setStaffError(err.message);
    }
  };

  const handleDispatchTestStaff = async () => {
    if (testStaffList.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to dispatch test messages to ${testStaffList.length} test teachers/staff in the registry?\n(Results will log real-time to Test_Teachers_And_Staff_Registry.xlsx).`
      )
    ) {
      return;
    }

    setStaffDispatching(true);
    setStaffError(null);
    try {
      const res = await fetch('/api/whatsapp/test-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          templateName: metaTemplateName,
          templateLanguage: metaTemplateLang,
          customText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || 'Test dispatch failed');
        return;
      }
      setTestStaffList(data.staff || []);
      setActionSuccessMsg(`Test Dispatch Complete: ${data.successCount} sent, ${data.failCount} failed.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setStaffError(err.message);
    } finally {
      setStaffDispatching(false);
    }
  };

  // 1. Load System Settings & Category Links
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data && data.categoryWhatsAppLinks) {
          setCategoryLinks(data.categoryWhatsAppLinks);
        }
        if (data && data.defaultWhatsAppGroupLink) {
          setDefaultGroupLink(data.defaultWhatsAppGroupLink);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Fetch official WhatsApp community groups (18 Official Groups)
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.defaultGroupLink) {
          setDefaultGroupLink(data.defaultGroupLink);
        }
        if (data.classCategories && data.classCategories.length > 0) {
          setAvailableClassCategories(data.classCategories);
        }
      }
    } catch (e) {
      console.error('Failed to load WhatsApp groups:', e);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleOpenAddGroupModal = () => {
    setEditingGroup(null);
    setGroupFormName('');
    setGroupFormComp(competitions[0] || 'Online Quiz');
    setGroupFormClass('All');
    setGroupFormUrl('');
    setGroupFormDesc('');
    setGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (grp: WhatsAppGroupLinkItem) => {
    setEditingGroup(grp);
    setGroupFormName(grp.groupName);
    setGroupFormComp(grp.competition);
    setGroupFormClass(grp.classRange || 'All');
    setGroupFormUrl(grp.url);
    setGroupFormDesc(grp.description || '');
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormUrl.trim().startsWith('https://chat.whatsapp.com/')) {
      alert('Please enter a valid WhatsApp invite link starting with https://chat.whatsapp.com/');
      return;
    }
    setSavingGroup(true);
    try {
      const res = await fetch('/api/whatsapp/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGroup?.id,
          groupName: groupFormName.trim() || `Mind Spark 2026 - ${groupFormComp}`,
          competition: groupFormComp,
          classRange: groupFormClass,
          url: groupFormUrl.trim(),
          description: groupFormDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save group link');
      setGroups(data.groups || []);
      setGroupModalOpen(false);
      setActionSuccessMsg(`WhatsApp Community Link for "${groupFormComp}" saved successfully!`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
      fetchStudents();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleResetToOfficialGroups = async () => {
    if (
      !confirm(
        'Are you sure you want to restore all 18 official WhatsApp community links provided for Mind Spark 2026?\nThis will reset custom URLs back to the school-verified defaults.'
      )
    ) {
      return;
    }
    setResettingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups?reset=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset groups');
      setGroups(data.groups || []);
      setActionSuccessMsg('Successfully restored all 18 official WhatsApp community links!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      fetchStudents();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResettingGroups(false);
    }
  };

  const handleDeleteGroup = async (id: string, groupName: string) => {
    if (!confirm(`Delete WhatsApp group link for "${groupName}"?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/groups?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete group');
      setGroups(data.groups || []);
      setActionSuccessMsg('Group removed.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSafeResend = async (student: Student) => {
    setResendingStudentId(student.studentId);
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [student.studentId],
          provider: 'icpaas',
          templateType: (student.lastTemplateName as any) || activeTemplate,
          customMessage: student.lastMessageContent || customText,
          usePreviousTemplateForResend: true,
          campaignName: `Safe Resend: ${student.name}`,
          delayMs: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resend failed');
      setActionSuccessMsg(`Safe Resend Dispatched to ${student.name}! (Previous template & group preserved)`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchStudents();
      setHistoryModalStudent((prev) =>
        prev && prev.studentId === student.studentId
          ? {
              ...prev,
              whatsappStatus: 'SENT',
              whatsappSentAt: new Date().toISOString(),
              messageHistory: [
                ...(prev.messageHistory || []),
                {
                  templateId: prev.lastTemplateName || activeTemplate,
                  templateName: prev.lastTemplateName || 'Mind Spark Approved Template',
                  templateVersion: prev.lastTemplateVersion || 'v1',
                  messageContent: prev.lastMessageContent,
                  groupLink: prev.lastGroupLink,
                  sentAt: new Date().toISOString(),
                  status: 'SENT',
                  provider: 'icpaas',
                },
              ],
            }
          : prev
      );
    } catch (err: any) {
      alert(`Resend error: ${err.message}`);
    } finally {
      setResendingStudentId(null);
    }
  };

  const handleSaveCategoryLinks = async () => {
    setSavingCategoryLinks(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryWhatsAppLinks: categoryLinks,
          defaultWhatsAppGroupLink: defaultGroupLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Category WhatsApp Group links');
      }
      setSettings(data.settings);
      setActionSuccessMsg('Category WhatsApp Group links successfully saved in database!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingCategoryLinks(false);
    }
  };

  // 2. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Fetch paginated candidates & filter stats
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedSearch,
        competition: selectedCompetition,
        classCategory: selectedClassCategory,
        groupId: selectedGroupId,
        schoolOrCollege: selectedSchool,
        whatsappStatus: statusFilter === 'ALL' ? '' : statusFilter,
      });

      const res = await fetch(`/api/whatsapp/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: Student[] = data.students || [];
        setStudents(list);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.competitions) setCompetitions(data.competitions);
        if (data.competitionStats) setCompetitionStats(data.competitionStats);
        if (data.classCategoryStats) setClassCategoryStats(data.classCategoryStats);
        if (data.groupStats) setGroupStats(data.groupStats);
        if (data.schools) setSchools(data.schools);
        if (data.stats) setStats(data.stats);

        if (list.length > 0 && !singleStudent) {
          setSingleStudent(list[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch whatsapp students:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedCompetition, selectedClassCategory, selectedGroupId, selectedSchool, statusFilter, singleStudent]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Load Dynamic Templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/whatsapp/templates');
      if (res.ok) {
        const data = await res.json();
        setCustomTemplates(data.customTemplates || []);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSaveTemplate = async () => {
    if (!tplTitle.trim() || !tplContent.trim()) {
      alert('Please enter template title and message content.');
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplateId,
          title: tplTitle,
          description: tplDesc,
          content: tplContent,
          categoryFilter: tplCategory,
          metaTemplateName: tplMetaName || 'admit_card_new',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');
      setCustomTemplates(data.customTemplates || []);
      setTemplateModalOpen(false);
      setEditingTemplateId(null);
      setTplTitle('');
      setTplDesc('');
      setTplContent('');
      setActionSuccessMsg('Template saved successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom template?')) return;
    try {
      const res = await fetch(`/api/whatsapp/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template');
      setCustomTemplates(data.customTemplates || []);
      setActionSuccessMsg('Template deleted successfully.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Launch Competition & Class-Targeted Campaign
  const handleLaunchCampaign = async () => {
    setLaunchingCampaign(true);
    setCampaignResult(null);
    try {
      const params = new URLSearchParams({
        all: 'true',
        competition: campaignTargetGroup === 'ALL' ? '' : campaignTargetGroup,
        classCategory: campaignTargetClass === 'ALL' ? '' : campaignTargetClass,
        groupId: campaignTargetOfficialGroup,
        whatsappStatus: campaignOnlyUnsent ? 'NOT_SENT' : '',
      });
      const studentRes = await fetch(`/api/whatsapp/students?${params.toString()}`);
      const studentData = await studentRes.json();
      const targetCandidates: Student[] = studentData.students || [];

      if (targetCandidates.length === 0) {
        alert(`No candidates found matching Competition "${campaignTargetGroup}" and Class "${campaignTargetClass}" with selected filter.`);
        setLaunchingCampaign(false);
        return;
      }

      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: targetCandidates.map((s) => s.studentId),
          provider: campaignProvider,
          templateType: campaignTargetTemplate,
          campaignName: campaignNameInput.trim() || `${campaignTargetGroup} ${campaignTargetClass !== 'ALL' ? `(${campaignTargetClass})` : ''} Blast (${new Date().toLocaleDateString('en-IN')})`,
          competitionGroup: campaignTargetGroup,
          classGroup: campaignTargetClass,
          usePreviousTemplateForResend,
          templateName: metaTemplateName,
          templateLanguage: metaTemplateLang,
          variableMapping: metaVariables,
          delayMs: 80,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Campaign dispatch failed');
      }

      setCampaignResult({
        total: targetCandidates.length,
        succeeded: resData.succeededCount || 0,
        failed: resData.failedCount || 0,
        message: resData.message || 'Campaign finished successfully.',
      });

      fetchStudents();
      fetch('/api/settings').then((r) => r.json()).then(setSettings);
      setActionSuccessMsg(`Campaign "${campaignNameInput || campaignTargetGroup}" Dispatched: ${resData.succeededCount || 0} succeeded, ${resData.failedCount || 0} failed.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Campaign error: ${err.message}`);
    } finally {
      setLaunchingCampaign(false);
    }
  };

  // 4. Update template text when active template changes
  const handleTemplateChange = (tplId: string) => {
    setActiveTemplate(tplId as any);
    const all = getAllAvailableTemplates(settings);
    const found = all.find((t) => t.id === tplId);
    if (found) {
      const textToUse = found.groupUrl
        ? found.defaultText.replace('{whatsapp_group_link}', found.groupUrl)
        : found.defaultText;
      setCustomText(textToUse);
      if (found.metaTemplateName) {
        setMetaTemplateName(found.metaTemplateName);
      }
    } else if (WHATSAPP_TEMPLATES[tplId]) {
      const fallbackTpl = WHATSAPP_TEMPLATES[tplId];
      const textToUse = fallbackTpl.groupUrl
        ? fallbackTpl.defaultText.replace('{whatsapp_group_link}', fallbackTpl.groupUrl)
        : fallbackTpl.defaultText;
      setCustomText(textToUse);
    }
  };

  // Select Official WhatsApp Community Group (18 Communities)
  const handleSelectOfficialGroup = (grpId: string) => {
    setSelectedGroupId(grpId);
    setPage(1);
    if (!grpId) {
      return;
    }
    const configuredList = groups.length > 0 ? groups : OFFICIAL_WHATSAPP_GROUPS;
    const foundGroup = configuredList.find((g) => g.id === grpId);
    if (foundGroup) {
      if (foundGroup.competition && foundGroup.competition !== 'All') {
        setSelectedCompetition(foundGroup.competition);
      }
      if (foundGroup.classRange && foundGroup.classRange !== 'All') {
        setSelectedClassCategory(foundGroup.classRange);
      } else if (foundGroup.classRange === 'All') {
        setSelectedClassCategory('');
      }
      // Automatically switch composer template to match this official group
      const matchingTpl = OFFICIAL_COMPETITION_TEMPLATES.find((t) => t.groupLinkId === grpId);
      if (matchingTpl) {
        handleTemplateChange(matchingTpl.id);
      }
    }
  };

  // 5. Insert merge tag at cursor position
  const insertMergeTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomText((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prev = customText;
    const next = prev.substring(0, start) + tag + prev.substring(end);
    setCustomText(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // 6. Checkbox Selection Logic
  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
    setSelectAllMatching(false);
  };

  const handleSelectPage = () => {
    const pageIds = students.map((s) => s.studentId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOnPageSelected = pageIds.every((id) => next.has(id));
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setSelectAllMatching(false);
  };

  const handleSelectAllFiltered = async () => {
    if (selectAllMatching) {
      setSelectedIds(new Set());
      setSelectAllMatching(false);
      setAllMatchingStudents([]);
      return;
    }

    setFetchingAll(true);
    try {
      const params = new URLSearchParams({
        all: 'true',
        search: debouncedSearch,
        competition: selectedCompetition,
        classCategory: selectedClassCategory,
        groupId: selectedGroupId,
        schoolOrCollege: selectedSchool,
        whatsappStatus: statusFilter === 'ALL' ? '' : statusFilter,
      });

      const res = await fetch(`/api/whatsapp/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const allList: Student[] = data.students || [];
        setAllMatchingStudents(allList);
        setSelectedIds(new Set(allList.map((s) => s.studentId)));
        setSelectAllMatching(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    setAllMatchingStudents([]);
  };

  // Get active list of selected students for processing
  const getSelectedStudentsList = (): Student[] => {
    if (selectAllMatching && allMatchingStudents.length > 0) {
      return allMatchingStudents;
    }
    const idSet = selectedIds;
    return students.filter((s) => idSet.has(s.studentId));
  };

  // 7. Update status in database for individual or bulk
  const updateStudentStatusInDb = async (studentId: string, status: WhatsAppStatus) => {
    try {
      await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      });
      setStudents((prev) =>
        prev.map((s) => (s.studentId === studentId ? { ...s, whatsappStatus: status, whatsappSentAt: new Date().toISOString() } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkMarkStatus = async (status: 'SENT' | 'NOT_SENT') => {
    const list = getSelectedStudentsList();
    if (list.length === 0) return;

    const action = status === 'SENT' ? 'mark_sent' : 'reset_unsent';
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: list.map((s) => s.studentId),
          provider: action,
        }),
      });
      if (res.ok) {
        setActionSuccessMsg(`Updated ${list.length} candidate(s) to ${status}`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        fetchStudents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Queue Runner Engine
  const startBulkQueue = () => {
    const selected = getSelectedStudentsList();
    const targetList = selected.length > 0 ? selected : students;
    if (targetList.length === 0) {
      alert('No candidates available to dispatch.');
      return;
    }

    setQueueCandidates(targetList);
    setQueueIndex(0);
    setQueueSentCount(0);
    setQueueSkippedCount(0);
    setQueueFinished(false);
    setIsQueuePaused(false);
    setQueueCountdown(queueIntervalSec);
    setIsQueueActive(true);
  };

  // Step Mode: Send current candidate & advance
  const handleQueueSendAndNext = () => {
    if (queueIndex >= queueCandidates.length) {
      setQueueFinished(true);
      return;
    }

    const current = queueCandidates[queueIndex];
    if (settings) {
      const rendered = renderMessageTemplate(customText, current, settings);
      const link = generateWhatsAppLink(current, settings, rendered);
      window.open(link, '_blank');
      updateStudentStatusInDb(current.studentId, 'SENT');
      setQueueSentCount((c) => c + 1);
    }

    const nextIdx = queueIndex + 1;
    if (nextIdx >= queueCandidates.length) {
      setQueueFinished(true);
    } else {
      setQueueIndex(nextIdx);
      setQueueCountdown(queueIntervalSec);
    }
  };

  // Step Mode: Skip candidate
  const handleQueueSkip = () => {
    setQueueSkippedCount((c) => c + 1);
    const nextIdx = queueIndex + 1;
    if (nextIdx >= queueCandidates.length) {
      setQueueFinished(true);
    } else {
      setQueueIndex(nextIdx);
      setQueueCountdown(queueIntervalSec);
    }
  };

  // Auto-runner countdown timer
  useEffect(() => {
    if (!isQueueActive || queueMode !== 'auto' || isQueuePaused || queueFinished) return;

    if (queueIndex >= queueCandidates.length) {
      setQueueFinished(true);
      return;
    }

    if (queueCountdown > 0) {
      const timer = setTimeout(() => {
        setQueueCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleQueueSendAndNext();
    }
  }, [isQueueActive, queueMode, isQueuePaused, queueFinished, queueCountdown, queueIndex, queueCandidates.length]);

  // 9. Meta Cloud API Bulk Dispatch
  const handleCloudApiBulkSend = async () => {
    const list = getSelectedStudentsList();
    const target = list.length > 0 ? list : students;
    if (target.length === 0) {
      alert('Please select at least one candidate for bulk send.');
      return;
    }

    if (!confirm(`Are you sure you want to send automated WhatsApp messages to ${target.length} candidate(s) via official Meta Cloud API?`)) {
      return;
    }

    setIsCloudSending(true);
    setCloudSendSummary(null);
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: target.map((s) => s.studentId),
          provider: 'cloud_api',
          templateType: activeTemplate,
          customMessage: customText,
          usePreviousTemplateForResend,
          competitionGroup: selectedCompetition || 'ALL',
          campaignName: `Cloud API Dispatch (${selectedCompetition || 'All'} - ${new Date().toLocaleDateString('en-IN')})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch via Cloud API');
      }

      setCloudSendSummary(
        `Dispatched ${data.total} messages: ${data.succeededCount} succeeded, ${data.failedCount} failed.`
      );
      fetchStudents();
    } catch (err: any) {
      alert(`Cloud API Send Error: ${err.message}`);
    } finally {
      setIsCloudSending(false);
    }
  };

  // 9b. ICPaaS Official Gateway Bulk Dispatch in Chunks of 100
  const [isIcpaasSending, setIsIcpaasSending] = useState(false);
  const [icpaasProgress, setIcpaasProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    totalCandidates: number;
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const handleIcpaasBulkSend = async () => {
    const list = getSelectedStudentsList();
    const target = list.length > 0 ? list : students;
    if (target.length === 0) {
      alert('Please select at least one candidate for bulk send.');
      return;
    }

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(target.length / BATCH_SIZE);

    if (
      !confirm(
        `Kya aap ${target.length} candidates ko ${totalBatches} batches (har batch me 100) me ICPaaS Gateway se WhatsApp bhejna chahte hain?\n(Results real-time me database aur local Excel sheet me log honge).`
      )
    ) {
      return;
    }

    setIsIcpaasSending(true);
    setCloudSendSummary(null);

    let totalSucceeded = 0;
    let totalFailed = 0;
    let processedSoFar = 0;

    try {
      for (let b = 0; b < totalBatches; b++) {
        const batchSlice = target.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        setIcpaasProgress({
          currentBatch: b + 1,
          totalBatches,
          totalCandidates: target.length,
          processed: processedSoFar,
          succeeded: totalSucceeded,
          failed: totalFailed,
        });

        const res = await fetch('/api/whatsapp/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentIds: batchSlice.map((s) => s.studentId),
            provider: 'icpaas',
            templateType: activeTemplate,
            customMessage: customText,
            templateName: metaTemplateName,
            templateLanguage: metaTemplateLang,
            variableMapping: metaVariables,
            usePreviousTemplateForResend,
            competitionGroup: selectedCompetition || 'ALL',
            campaignName: `ICPaaS Bulk Blast (${selectedCompetition || 'All'} - ${new Date().toLocaleDateString('en-IN')})`,
            delayMs: 100,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Batch ${b + 1} execution failed`);
        }

        totalSucceeded += data.succeededCount || 0;
        totalFailed += data.failedCount || 0;
        processedSoFar += batchSlice.length;

        setIcpaasProgress({
          currentBatch: b + 1,
          totalBatches,
          totalCandidates: target.length,
          processed: processedSoFar,
          succeeded: totalSucceeded,
          failed: totalFailed,
        });
      }

      setCloudSendSummary(
        `✅ ICPaaS Bulk Send Complete: ${target.length} candidates processed across ${totalBatches} batches of 100! (${totalSucceeded} Succeeded, ${totalFailed} Failed). Data real-time me Database aur Excel log me update ho chuka hai.`
      );
      fetchStudents();
    } catch (err: any) {
      alert(`ICPaaS Dispatch Error: ${err.message}`);
    } finally {
      setIsIcpaasSending(false);
      setIcpaasProgress(null);
    }
  };

  // 10. Copy utilities
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export broadcast numbers
  const getFormattedPhoneList = (delimiter: ',' | '\n'): string => {
    const list = getSelectedStudentsList().length > 0 ? getSelectedStudentsList() : students;
    return list
      .map((s) => normalizePhone(s.phone))
      .filter((p) => p.length === 10)
      .join(delimiter === ',' ? ', ' : '\n');
  };

  // First candidate for preview
  const previewCandidate =
    selectedIds.size > 0 && getSelectedStudentsList().length > 0
      ? getSelectedStudentsList()[0]
      : singleStudent || students[0] || null;

  const renderedPreviewMessage =
    previewCandidate && settings
      ? renderMessageTemplate(customText, previewCandidate, settings)
      : '';

  const selectedCount = selectAllMatching
    ? total
    : selectedIds.size;

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 pb-16">
      {/* Official UP Portal Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              WhatsApp Dispatch & Messaging Console
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Dispatch examination schedules, admit card links, and venue updates to candidates via WhatsApp.
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={startBulkQueue}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-amber-300" />
            <span>Start Bulk Queue</span>
          </button>

          <form action="/api/whatsapp/export" method="POST" target="_blank" className="inline">
            <input type="hidden" name="format" value="xlsx" />
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>Download Excel Report</span>
            </button>
          </form>
        </div>
      </div>

      {/* Metrics Row - UP Scholarship Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-[#7a0c16]">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Total Students
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#7a0c16] mt-1 tabular-nums">
            {stats.totalActive}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Registered Student Records
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-emerald-700">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Dispatched (Sent)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {stats.sentCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Successfully Delivered
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-amber-600">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Pending Queue
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">
            {stats.pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Awaiting Dispatch
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-slate-700">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Dispatch Mode
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Browser Queue
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Direct & Cloud API
          </div>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-3 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'bulk'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bulk Dispatch</span>
          {selectedCount > 0 && (
            <span className="ml-1.5 px-2 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px]">
              {selectedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'groups'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>🏆 Competition Groups</span>
          <span className="ml-1.5 px-2 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
            {competitions.length || 16}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>📝 Dynamic Templates</span>
          {customTemplates.length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
              {customTemplates.length} Custom
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-purple-600" />
          <span>📊 Campaign History</span>
          {settings?.whatsappCampaigns && settings.whatsappCampaigns.length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px]">
              {settings.whatsappCampaigns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categoryGroups')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'categoryGroups'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>📱 Official Communities</span>
          <span className="ml-1.5 px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold font-mono">
            {groups.length || 18}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('testStaff')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'testStaff'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4 text-amber-600" />
          <span>🧪 Test Staff Registry</span>
          {testStaffList.length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
              {testStaffList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('single')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'single'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Single Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Broadcast List</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Cloud API Settings</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BULK MESSAGING DESK */}
      {/* ========================================================================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Top Row: Template Composer & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Selector & Dynamic Composer (7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-sm text-slate-900">Message Template & Composer</h2>
                </div>
                <span className="text-[11px] text-slate-500">Live dynamic variable merge</span>
              </div>

              {/* Template Selector Section */}
              <div className="space-y-2.5">
                {/* Row 1: Universal Templates Pills & Auto-Select button */}
                <div className="flex flex-wrap gap-1.5 items-center justify-between">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 mr-1 tracking-wider">
                      Universal:
                    </span>
                    {UNIVERSAL_TEMPLATES.map((tpl) => {
                      const isCurrent = activeTemplate === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleTemplateChange(tpl.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#7a0c16] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {tpl.title.replace(' (Official Mind Spark 2026)', '')}
                        </button>
                      );
                    })}
                  </div>

                  {(selectedCompetition || selectedClassCategory) && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = getRecommendedTemplateForStudent(
                          {
                            competitionName: selectedCompetition || undefined,
                            className: selectedClassCategory || undefined,
                          },
                          settings
                        );
                        handleTemplateChange(rec.id);
                        setActionSuccessMsg(`🎯 Auto-selected: "${rec.title}" for current filter`);
                        setTimeout(() => setActionSuccessMsg(null), 3000);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Auto-select matching official template for the active competition & class filters"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>Auto-Pick for Filter</span>
                    </button>
                  )}
                </div>

                {/* Row 2: 18 Official Competition-Specific Templates Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-xl border border-amber-200/80">
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-extrabold uppercase tracking-wide">
                      18 Competition Presets
                    </span>
                    <span className="text-[11px] font-medium text-amber-950 hidden md:inline">
                      Official tailored templates:
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={OFFICIAL_COMPETITION_TEMPLATES.some((t) => t.id === activeTemplate) ? activeTemplate : ''}
                      onChange={(e) => {
                        if (e.target.value) handleTemplateChange(e.target.value);
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                    >
                      <option value="">-- Choose from 18 Competition Templates --</option>
                      {OFFICIAL_COMPETITION_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          🏆 {t.title} [{t.categoryFilter} &bull; {t.classFilter}]
                        </option>
                      ))}
                    </select>
                  </div>
                  {OFFICIAL_COMPETITION_TEMPLATES.some((t) => t.id === activeTemplate) && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded shrink-0">
                      ✓ Active Preset
                    </span>
                  )}
                </div>

                {/* Row 3: Custom Admin Templates & Create New */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  {customTemplates.length > 0 && (
                    <>
                      <span className="text-[10px] font-extrabold uppercase text-indigo-600 mr-1 tracking-wider">
                        Custom:
                      </span>
                      {customTemplates.map((cTpl) => {
                        const isCurrent = activeTemplate === cTpl.id;
                        return (
                          <button
                            key={cTpl.id}
                            type="button"
                            onClick={() => {
                              setActiveTemplate(cTpl.id as any);
                              setCustomText(cTpl.content);
                              if (cTpl.metaTemplateName) setMetaTemplateName(cTpl.metaTemplateName);
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 ${
                              isCurrent
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{cTpl.title} (v{cTpl.version || 1})</span>
                          </button>
                        );
                      })}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTplTitle('');
                      setTplDesc('');
                      setTplCategory('ALL');
                      setTplContent('');
                      setTplMetaName('admit_card_new');
                      setTemplateModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-[#7a0c16] hover:bg-rose-50 rounded-lg border border-dashed border-[#7a0c16] flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Custom Template</span>
                  </button>
                </div>
              </div>

              {/* Merge Tag Chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>Insert Dynamic Tag:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Automatically personalized for each student</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  {WHATSAPP_MERGE_TAGS.map((tagItem) => (
                    <button
                      key={tagItem.tag}
                      type="button"
                      onClick={() => insertMergeTag(tagItem.tag)}
                      title={`Example: ${tagItem.example}`}
                      className="px-2 py-1 bg-white hover:bg-rose-50 hover:text-[#7a0c16] hover:border-amber-300 border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 transition-colors"
                    >
                      + {tagItem.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editor Textarea */}
              <div className="space-y-1">
                <textarea
                  ref={textareaRef}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={8}
                  placeholder="Type your WhatsApp message..."
                  className="w-full p-3.5 text-xs font-mono leading-relaxed border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                  <span>Formatting: *bold*, _italics_, ~strike~, ```code```</span>
                  <span>{customText.length} characters</span>
                </div>
              </div>
            </div>

            {/* Right: Live WhatsApp Chat Bubble Preview (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-bold text-sm text-slate-900">Message Preview</h2>
                  </div>
                  {previewCandidate && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(renderedPreviewMessage)}
                      className="text-xs text-[#7a0c16] hover:text-[#5c000b] flex items-center space-x-1 font-semibold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {previewCandidate ? (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-bold text-slate-900">{previewCandidate.name}</span>{' '}
                        <span className="text-slate-500 font-mono">({previewCandidate.registrationNumber})</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#7a0c16] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        +91 {previewCandidate.phone}
                      </span>
                    </div>

                    {/* WhatsApp Chat Bubble Mockup */}
                    <div className="p-4 bg-[#e5ddd5]/60 rounded-2xl border border-slate-200 shadow-inner">
                      <div className="max-w-[92%] bg-white rounded-xl rounded-tl-none p-3.5 shadow-sm text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed relative">
                        {renderedPreviewMessage}
                        <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end space-x-1">
                          <span>09:41 AM</span>
                          <span className="text-emerald-500 font-bold">&#10003;&#10003;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No candidates available for preview.
                  </div>
                )}
              </div>

              {/* Quick Launch Button for this previewed student */}
              {previewCandidate && settings && (
                <div className="pt-2">
                  <a
                    href={generateWhatsAppLink(previewCandidate, settings, renderedPreviewMessage)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => updateStudentStatusInDb(previewCandidate.studentId, 'OPENED')}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 text-center shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test to {previewCandidate.name.split(' ')[0]}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Candidates Directory & Selection Desk */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Filter and Selection Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Student Directory ({total} Total)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select candidate recipients for dispatch
                  </p>
                         {/* Bulk Actions Cluster */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignTargetGroup(selectedCompetition || 'ALL');
                      setCampaignTargetTemplate(activeTemplate);
                      setCampaignNameInput(`${selectedCompetition || 'General'} Blast`);
                      setCampaignModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>🚀 Launch Campaign</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleIcpaasBulkSend}
                    disabled={isIcpaasSending || isCloudSending || total === 0}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-200" />
                    <span>
                      {isIcpaasSending
                        ? `Sending Batch ${icpaasProgress?.currentBatch || 1}/${icpaasProgress?.totalBatches || 1}...`
                        : `Send ICPaaS (100 Bulk)`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={startBulkQueue}
                    disabled={total === 0}
                    className="px-3 py-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-300" />
                    <span>Start Queue ({selectedCount > 0 ? selectedCount : total})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloudApiBulkSend}
                    disabled={isCloudSending || isIcpaasSending || total === 0}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isCloudSending ? 'Sending Cloud...' : 'Send via Cloud API'}</span>
                  </button>

                  <a
                    href="/api/whatsapp/export"
                    title="Download Real-Time Excel Dispatch Log"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Excel Log</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleBulkMarkStatus('SENT')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Mark Sent
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkMarkStatus('NOT_SENT')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Reset Unsent
                  </button>
                </div>
              </div>

              {/* Real-time ICPaaS 100 Bulk Dispatch Progress Card */}
              {icpaasProgress && (
                <div className="p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-emerald-950">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                      <span>
                        Processing Batch {icpaasProgress.currentBatch} of {icpaasProgress.totalBatches} (100 Bulk Mode)
                      </span>
                    </div>
                    <span className="font-mono">
                      {Math.round((icpaasProgress.processed / icpaasProgress.totalCandidates) * 100)}%
                    </span>
                  </div>

                  <div className="w-full bg-emerald-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (icpaasProgress.processed / icpaasProgress.totalCandidates) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-emerald-800 font-medium pt-0.5 gap-2">
                    <span>
                      Progress: <strong>{icpaasProgress.processed}</strong> / {icpaasProgress.totalCandidates} candidates
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-emerald-700 font-bold">✓ Succeeded: {icpaasProgress.succeeded}</span>
                      <span className="text-red-700 font-bold">✗ Failed: {icpaasProgress.failed}</span>
                      <span className="text-slate-600 font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Real-time Sync: DB + Excel Log
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {cloudSendSummary && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-medium">{cloudSendSummary}</span>
                  <button onClick={() => setCloudSendSummary(null)} className="text-emerald-800 font-bold ml-2 hover:underline">Dismiss</button>
                </div>
              )}

              {/* Filters & Resend Option row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, reg no, phone..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                    />
                  </div>

                  {/* Official WhatsApp Community Group Filter (18 Communities) */}
                  <select
                    value={selectedGroupId}
                    onChange={(e) => handleSelectOfficialGroup(e.target.value)}
                    className="px-2.5 py-1.5 border border-emerald-400 bg-emerald-50 text-emerald-950 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600 max-w-[260px] truncate"
                    title="Filter candidates strictly by their official WhatsApp group (e.g. Online Quiz Graduation vs 9-10 vs 11-12)"
                  >
                    <option value="">📱 WhatsApp Group (All 18)</option>
                    <optgroup label="🎓 Online Quiz Communities (Separate Tiers)">
                      <option value="grp_online_quiz_grad">
                        🎓 Online Quiz (Graduation) {groupStats['grp_online_quiz_grad'] ? `(${groupStats['grp_online_quiz_grad'].total})` : ''}
                      </option>
                      <option value="grp_online_quiz_9_10">
                        📚 Online Quiz (Classes 9–10) {groupStats['grp_online_quiz_9_10'] ? `(${groupStats['grp_online_quiz_9_10'].total})` : ''}
                      </option>
                      <option value="grp_online_quiz_11_12">
                        🎓 Online Quiz (Classes 11–12) {groupStats['grp_online_quiz_11_12'] ? `(${groupStats['grp_online_quiz_11_12'].total})` : ''}
                      </option>
                    </optgroup>
                    <optgroup label="🏆 Senior Competitions">
                      <option value="grp_essay_writing">
                        📝 Essay Writing (All Classes) {groupStats['grp_essay_writing'] ? `(${groupStats['grp_essay_writing'].total})` : ''}
                      </option>
                      <option value="grp_writing_quest_11_12">
                        ✍️ Writing Quest (Classes 11–12) {groupStats['grp_writing_quest_11_12'] ? `(${groupStats['grp_writing_quest_11_12'].total})` : ''}
                      </option>
                      <option value="grp_young_innovators_9_10">
                        💡 Young Innovators (Classes 9–10) {groupStats['grp_young_innovators_9_10'] ? `(${groupStats['grp_young_innovators_9_10'].total})` : ''}
                      </option>
                    </optgroup>
                    <optgroup label="🔬 Middle & Primary School">
                      <option value="grp_fireless_cooking_6_8">
                        🍳 Fireless Cooking (Classes 6–8) {groupStats['grp_fireless_cooking_6_8'] ? `(${groupStats['grp_fireless_cooking_6_8'].total})` : ''}
                      </option>
                      <option value="grp_junior_scientist_6_8">
                        🔬 Junior Scientist (Classes 6–8) {groupStats['grp_junior_scientist_6_8'] ? `(${groupStats['grp_junior_scientist_6_8'].total})` : ''}
                      </option>
                      <option value="grp_battle_of_brains_4_5">
                        🧠 Battle of Brains (Classes 4–5) {groupStats['grp_battle_of_brains_4_5'] ? `(${groupStats['grp_battle_of_brains_4_5'].total})` : ''}
                      </option>
                      <option value="grp_poster_artist_4_5">
                        🎨 Poster Artist (Classes 4–5) {groupStats['grp_poster_artist_4_5'] ? `(${groupStats['grp_poster_artist_4_5'].total})` : ''}
                      </option>
                      <option value="grp_paint_your_imagination_2_3">
                        🖌️ Paint Your Imagination (Classes 2–3) {groupStats['grp_paint_your_imagination_2_3'] ? `(${groupStats['grp_paint_your_imagination_2_3'].total})` : ''}
                      </option>
                      <option value="grp_writing_stars_2_3">
                        ⭐ Writing Stars (Classes 2–3) {groupStats['grp_writing_stars_2_3'] ? `(${groupStats['grp_writing_stars_2_3'].total})` : ''}
                      </option>
                      <option value="grp_dress_to_impress_1">
                        👗 Dress To Impress (Class 1) {groupStats['grp_dress_to_impress_1'] ? `(${groupStats['grp_dress_to_impress_1'].total})` : ''}
                      </option>
                      <option value="grp_clay_champs_1">
                        🏺 Clay Champs (Class 1) {groupStats['grp_clay_champs_1'] ? `(${groupStats['grp_clay_champs_1'].total})` : ''}
                      </option>
                    </optgroup>
                    <optgroup label="🎨 Pre-Primary & Kindergarten">
                      <option value="grp_complete_the_picture_ukg">
                        🖼️ Complete The Picture (UKG) {groupStats['grp_complete_the_picture_ukg'] ? `(${groupStats['grp_complete_the_picture_ukg'].total})` : ''}
                      </option>
                      <option value="grp_join_the_dots_lkg">
                        ✏️ Join The Dots (LKG) {groupStats['grp_join_the_dots_lkg'] ? `(${groupStats['grp_join_the_dots_lkg'].total})` : ''}
                      </option>
                      <option value="grp_colour_by_number_nursery">
                        🔢 Colour by Number (Nursery) {groupStats['grp_colour_by_number_nursery'] ? `(${groupStats['grp_colour_by_number_nursery'].total})` : ''}
                      </option>
                      <option value="grp_handmade_fancy_playgroup">
                        🎭 Fancy Design (Play Group) {groupStats['grp_handmade_fancy_playgroup'] ? `(${groupStats['grp_handmade_fancy_playgroup'].total})` : ''}
                      </option>
                    </optgroup>
                  </select>

                  {/* Competition Filter */}
                  <select
                    value={selectedCompetition}
                    onChange={(e) => {
                      setSelectedCompetition(e.target.value);
                      setSelectedGroupId('');
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  >
                    <option value="">All Competitions</option>
                    {competitions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Class Category Filter */}
                  <select
                    value={selectedClassCategory}
                    onChange={(e) => {
                      setSelectedClassCategory(e.target.value);
                      setSelectedGroupId('');
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7a0c16] font-medium"
                  >
                    <option value="">All Class Categories</option>
                    {availableClassCategories.map((cls) => {
                      const cStat = classCategoryStats[cls];
                      return (
                        <option key={cls} value={cls}>
                          {cls} {cStat ? `(${cStat.total})` : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* School Filter */}
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[180px] truncate"
                  >
                    <option value="">All Schools / Colleges</option>
                    {schools.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Dispatch Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NOT_SENT">Unsent / Not Sent</option>
                    <option value="SENT">Sent</option>
                    <option value="OPENED">Opened in wa.me</option>
                  </select>
                </div>

                {/* Controlled Resend Mode Option */}
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg select-none shrink-0" title="When checked, students who already received a template will be resent their previous template and original group link">
                  <input
                    type="checkbox"
                    checked={usePreviousTemplateForResend}
                    onChange={(e) => setUsePreviousTemplateForResend(e.target.checked)}
                    className="rounded border-slate-300 text-[#7a0c16] focus:ring-[#7a0c16]"
                  />
                  <span>🔁 Controlled Resend Mode</span>
                </label>
              </div>
              </div>

              {/* Active Group Filter Banner */}
              {selectedGroupId && (() => {
                const activeGrp = (groups.length > 0 ? groups : OFFICIAL_WHATSAPP_GROUPS).find((g) => g.id === selectedGroupId);
                const matchingTpl = OFFICIAL_COMPETITION_TEMPLATES.find((t) => t.groupLinkId === selectedGroupId);
                if (!activeGrp) return null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-300 rounded-xl text-xs text-emerald-950 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span className="font-bold text-emerald-900">Filtered by Official Community:</span>
                      <span className="px-2.5 py-1 bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs">{activeGrp.groupName}</span>
                      <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                        👥 {total} Candidates
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={activeGrp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:text-emerald-950 rounded-lg hover:bg-emerald-100 flex items-center space-x-1 font-bold transition-colors"
                        title="Open WhatsApp Group"
                      >
                        <span>Open WhatsApp Group</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {matchingTpl && (
                        <span className="text-[11px] text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200">
                          Active Template: <strong>{matchingTpl.title}</strong>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGroupId('');
                          setSelectedCompetition('');
                          setSelectedClassCategory('');
                          setPage(1);
                        }}
                        className="text-xs text-rose-700 hover:text-rose-900 font-bold px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        ✕ Clear Group Filter
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Selection banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">
                    {selectedCount > 0 ? (
                      <span className="text-emerald-700 font-bold">{selectedCount} candidates selected</span>
                    ) : (
                      <span>No candidates selected</span>
                    )}
                  </span>
                  {selectAllMatching && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      All {total} filter matches selected
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectPage}
                    className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold"
                  >
                    Select Page ({students.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    disabled={fetchingAll}
                    className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold"
                  >
                    {fetchingAll ? 'Loading all...' : selectAllMatching ? 'Deselect All' : `Select All ${total} Filtered`}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && students.every((s) => selectedIds.has(s.studentId))}
                        onChange={handleSelectPage}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">School / College</th>
                    <th className="py-2.5 px-3">Event & Class</th>
                    <th className="py-2.5 px-3">Assigned Community Link</th>
                    <th className="py-2.5 px-3">WhatsApp Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading candidate directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No candidates match the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const isSelected = selectedIds.has(s.studentId);
                      const isSingleActive = singleStudent?.studentId === s.studentId;
                      const hasValidPhone = isValidIndianMobile(s.phone);
                      const st = s.whatsappStatus || 'NOT_SENT';
                      const resolvedGroup = resolveStudentWhatsAppGroup(s, settings);
                      const normClass = normalizeClassCategory(s.className);

                      return (
                        <tr
                          key={s.studentId}
                          onClick={() => setSingleStudent(s)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/60' : isSingleActive ? 'bg-rose-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(s.studentId)}
                              className="rounded border-slate-300 text-[#7a0c16] focus:ring-[#7a0c16]"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7a0c16]">
                            {s.registrationNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3">
                            <span className={`font-mono ${hasValidPhone ? 'text-slate-700' : 'text-red-500 font-bold'}`}>
                              {s.phone}
                            </span>
                            {!hasValidPhone && (
                              <span className="ml-1 text-[9px] text-red-600 bg-red-50 px-1 py-0.5 rounded">
                                Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate" title={s.schoolOrCollege}>
                            {s.schoolOrCollege}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div className="font-semibold text-slate-900 text-xs">
                              {s.competitionName}
                            </div>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono">
                                {normClass}
                              </span>
                              {s.className && (
                                <span className="text-[10px] text-slate-500 truncate max-w-[90px]" title={s.className}>
                                  Cl: {s.className}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[140px]" title={resolvedGroup.groupName}>
                                {resolvedGroup.groupName.replace('Mind Spark 2026 - ', '')}
                              </span>
                              {resolvedGroup.groupLink && (
                                <>
                                  <a
                                    href={resolvedGroup.groupLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                                    title="Open Official WhatsApp Community Link"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      copyToClipboard(resolvedGroup.groupLink);
                                      setActionSuccessMsg(`Group link copied for ${s.name}`);
                                      setTimeout(() => setActionSuccessMsg(null), 2500);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                    title="Copy WhatsApp Group Link"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                            {s.lastGroupLink && (
                              <div className="text-[9px] text-slate-500 font-mono mt-0.5" title={`Previously sent group: ${s.lastGroupLink}`}>
                                Sent: {s.lastGroupLink.replace('https://chat.whatsapp.com/', '')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div>
                              {st === 'SENT' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>SENT</span>
                                </span>
                              ) : st === 'OPENED' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                  <ExternalLink className="w-3 h-3 text-blue-600" />
                                  <span>OPENED</span>
                                </span>
                              ) : st === 'FAILED' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  <span>FAILED</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  NOT_SENT
                                </span>
                              )}
                            </div>
                            {(s.lastTemplateName || s.whatsappSentAt) && (
                              <div className="text-[10px] text-slate-500 mt-1 max-w-[130px] truncate" title={`${s.lastTemplateName || 'Template'} • ${s.whatsappSentAt ? new Date(s.whatsappSentAt).toLocaleString('en-IN') : ''}`}>
                                {s.lastTemplateName || 'Template'} {s.lastTemplateVersion ? `(${s.lastTemplateVersion})` : ''} {s.whatsappSentAt ? `• ${new Date(s.whatsappSentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setHistoryModalStudent(s)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                                title="View student WhatsApp history & delivery ID"
                              >
                                <History className="w-3 h-3 text-slate-500" />
                                <span>History ({s.messageHistory?.length || (st === 'SENT' ? 1 : 0)})</span>
                              </button>
                              {settings && (
                                <a
                                  href={generateWhatsAppLink(
                                    s,
                                    settings,
                                    renderMessageTemplate(customText, s, settings)
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => updateStudentStatusInDb(s.studentId, 'OPENED')}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Chat</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing <strong className="text-slate-900">{startRecord}</strong>–<strong className="text-slate-900">{endRecord}</strong> of{' '}
                <strong className="text-slate-900">{total}</strong> candidates
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: COMPETITION-WISE STUDENT GROUPING DESK */}
      {/* ========================================================================= */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                    Dynamic Grouping
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900">
                    {competitions.length} Competition Categories
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  🏆 Competition-Wise Student Grouping Desk
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Students are organized by their registered competition or activity. Launch targeted WhatsApp messages to a specific group, manage their WhatsApp community link, or filter candidates in the bulk desk without affecting other categories.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignTargetGroup('ALL');
                    setCampaignModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Launch New Campaign</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-200/70">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Total Competitions</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">{competitions.length}</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Total Students</div>
                <div className="text-xl font-extrabold text-[#7a0c16] mt-0.5">{stats.totalActive}</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Delivered (Sent)</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{stats.sentCount}</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending Messages</div>
                <div className="text-xl font-extrabold text-amber-800 mt-0.5">{stats.pendingCount}</div>
              </div>
            </div>
          </div>

          {/* Grid of Competition Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {competitions.map((comp) => {
              const grp = competitionStats[comp] || { total: 0, sent: 0, pending: 0, failed: 0 };
              const percent = grp.total > 0 ? Math.round((grp.sent / grp.total) * 100) : 0;
              const link = categoryLinks[comp] || '';

              return (
                <div
                  key={comp}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <Trophy className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1" title={comp}>
                            {comp}
                          </h3>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            Competition Group
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold font-mono">
                        {grp.total} Students
                      </span>
                    </div>

                    {/* Counts Row */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center">
                      <div>
                        <div className="text-[9px] font-bold text-emerald-700 uppercase">Sent</div>
                        <div className="text-sm font-extrabold text-emerald-700">{grp.sent}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-amber-700 uppercase">Pending</div>
                        <div className="text-sm font-extrabold text-amber-800">{grp.pending}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-rose-700 uppercase">Failed</div>
                        <div className="text-sm font-extrabold text-rose-700">{grp.failed}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Dispatch Progress</span>
                        <span>{percent}% Delivered</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* WhatsApp Group Link Status */}
                    <div className="pt-1 text-[11px] flex items-center justify-between">
                      <span className="text-slate-500 font-medium">WhatsApp Link:</span>
                      {link ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Configured
                          </span>
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:text-emerald-900"
                            title="Open WhatsApp Group"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Fallback Default
                        </span>
                      )}
                    </div>

                    {(() => {
                      const compSubGroups = (groups.length > 0 ? groups : OFFICIAL_WHATSAPP_GROUPS).filter(
                        (g) => normalizeCompetitionCategory(g.competition) === normalizeCompetitionCategory(comp)
                      );
                      if (compSubGroups.length <= 1) return null;
                      return (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Separate Class Communities ({compSubGroups.length}):</span>
                            <span className="text-emerald-700 font-mono font-bold">Official Groups</span>
                          </div>
                          <div className="space-y-1">
                            {compSubGroups.map((sg) => {
                              const sgStat = groupStats[sg.id];
                              return (
                                <div key={sg.id} className="flex items-center justify-between p-1.5 bg-amber-50/70 border border-amber-200/70 rounded-lg text-xs">
                                  <div className="truncate mr-1.5">
                                    <span className="font-bold text-amber-950">{sg.classRange === 'All' ? 'All Classes' : sg.classRange}: </span>
                                    <span className="text-[10px] text-slate-600 truncate">{sg.groupName.replace('Mind Spark ', '')}</span>
                                    {sgStat && <span className="ml-1 text-[10px] font-mono font-bold text-emerald-800">({sgStat.total})</span>}
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleSelectOfficialGroup(sg.id);
                                        setActiveTab('bulk');
                                      }}
                                      className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-bold cursor-pointer"
                                      title={`View & filter students in ${sg.groupName}`}
                                    >
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCampaignTargetGroup(sg.competition);
                                        setCampaignTargetClass(sg.classRange || 'ALL');
                                        setCampaignTargetOfficialGroup(sg.id);
                                        const matchingTpl = OFFICIAL_COMPETITION_TEMPLATES.find((t) => t.groupLinkId === sg.id);
                                        if (matchingTpl) setCampaignTargetTemplate(matchingTpl.id);
                                        setCampaignNameInput(`${sg.groupName} Blast`);
                                        setCampaignModalOpen(true);
                                      }}
                                      className="px-2 py-0.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded text-[10px] font-bold cursor-pointer"
                                      title={`Blast messages directly to ${sg.groupName}`}
                                    >
                                      Blast
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompetition(comp);
                        setActiveTab('bulk');
                      }}
                      className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
                      title="Filter and view all students in this group"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-600" />
                      <span>View ({grp.total})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTargetGroup(comp);
                        setCampaignTargetTemplate(activeTemplate);
                        setCampaignNameInput(`${comp} Blast`);
                        setCampaignModalOpen(true);
                      }}
                      className="flex-1 py-2 px-2.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-colors shadow-xs cursor-pointer"
                      title="Launch a targeted message campaign to this competition group"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-200" />
                      <span>Blast Group</span>
                    </button>

                    {link && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(link)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors shrink-0"
                        title="Copy group invite link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DYNAMIC MESSAGE TEMPLATES MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                    Full Customization
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-900">
                    No Code Changes Needed
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  📝 Dynamic Message Templates Manager
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Create, edit, save, and launch custom WhatsApp message templates directly from the admin panel.
                  Personalize with dynamic merge tags like <code>{'{name}'}</code>, <code>{'{reg_no}'}</code>, and <code>{'{whatsapp_group_link}'}</code>.
                  Templates are instantly saved to the database and can be launched to any competition group.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setTplTitle('');
                    setTplDesc('');
                    setTplCategory('ALL');
                    setTplContent(WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION.defaultText);
                    setTplMetaName('admit_card_new');
                    setTemplateModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Templates Filters & Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Type Category Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: `All (${UNIVERSAL_TEMPLATES.length + OFFICIAL_COMPETITION_TEMPLATES.length + customTemplates.length})` },
                  { id: 'COMPETITIONS', label: `🏆 18 Competition Presets (${OFFICIAL_COMPETITION_TEMPLATES.length})` },
                  { id: 'UNIVERSAL', label: `🌟 Universal Presets (${UNIVERSAL_TEMPLATES.length})` },
                  { id: 'CUSTOM', label: `✏️ Custom (${customTemplates.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTemplateTabType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      templateTabType === tab.id
                        ? 'bg-[#7a0c16] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search template title, text..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Filter Dropdowns Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-600">Filters:</span>
              </div>

              <select
                value={templateFilterComp}
                onChange={(e) => setTemplateFilterComp(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="ALL">All Competitions</option>
                {OFFICIAL_COMPETITION_CATEGORIES.map((comp) => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>

              <select
                value={templateFilterClass}
                onChange={(e) => setTemplateFilterClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="ALL">All Class Tiers</option>
                {availableClassCategories.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {(templateTabType !== 'ALL' || templateFilterComp !== 'ALL' || templateFilterClass !== 'ALL' || templateSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateTabType('ALL');
                    setTemplateFilterComp('ALL');
                    setTemplateFilterClass('ALL');
                    setTemplateSearchQuery('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Message Templates Library
              </h3>
              <span className="text-xs text-slate-500">
                18 Dedicated Competition Presets &bull; 4 Universal Presets &bull; {customTemplates.length} Custom Templates
              </span>
            </div>

            {(() => {
              const allList = [
                ...UNIVERSAL_TEMPLATES.map((t) => ({ ...t, kind: 'universal' as const })),
                ...OFFICIAL_COMPETITION_TEMPLATES.map((t) => ({ ...t, kind: 'competition' as const })),
                ...customTemplates.map((t) => ({
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  defaultText: t.content,
                  categoryFilter: t.categoryFilter,
                  classFilter: t.classFilter,
                  version: t.version || 1,
                  metaTemplateName: t.metaTemplateName,
                  versionsHistory: t.versionsHistory,
                  groupUrl: undefined as string | undefined,
                  kind: 'custom' as const,
                })),
              ];

              const filtered = allList.filter((item) => {
                if (templateTabType === 'COMPETITIONS' && item.kind !== 'competition') return false;
                if (templateTabType === 'UNIVERSAL' && item.kind !== 'universal') return false;
                if (templateTabType === 'CUSTOM' && item.kind !== 'custom') return false;

                if (templateFilterComp !== 'ALL') {
                  if (item.categoryFilter && normalizeCompetitionCategory(item.categoryFilter) !== normalizeCompetitionCategory(templateFilterComp)) {
                    return false;
                  }
                  if (!item.categoryFilter && item.kind !== 'universal') return false;
                }

                if (templateFilterClass !== 'ALL') {
                  if (item.classFilter && item.classFilter !== 'All' && normalizeClassCategory(item.classFilter) !== normalizeClassCategory(templateFilterClass)) {
                    return false;
                  }
                }

                if (templateSearchQuery.trim()) {
                  const q = templateSearchQuery.toLowerCase();
                  const matchTitle = item.title.toLowerCase().includes(q);
                  const matchDesc = (item.description || '').toLowerCase().includes(q);
                  const matchText = item.defaultText.toLowerCase().includes(q);
                  if (!matchTitle && !matchDesc && !matchText) return false;
                }

                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-700">No message templates match the selected filter criteria.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateTabType('ALL');
                        setTemplateFilterComp('ALL');
                        setTemplateFilterClass('ALL');
                        setTemplateSearchQuery('');
                      }}
                      className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filtered.map((item) => {
                    const isOfficialComp = item.kind === 'competition';
                    const isUniversal = item.kind === 'universal';
                    const isCustom = item.kind === 'custom';

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 border-2 transition-all ${
                          isOfficialComp
                            ? 'border-amber-200/90 hover:border-amber-400'
                            : isCustom
                            ? 'border-indigo-200 hover:border-indigo-400'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isOfficialComp && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wide">
                                      🏆 18 Competition Preset
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                                      {item.categoryFilter}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold font-mono">
                                      Class {item.classFilter}
                                    </span>
                                  </>
                                )}
                                {isUniversal && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                                      🌟 Universal Preset
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold">
                                      All Categories & Classes
                                    </span>
                                  </>
                                )}
                                {isCustom && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">
                                      Custom v{item.version || 1}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                      {item.categoryFilter || 'ALL'}
                                    </span>
                                    {item.classFilter && item.classFilter !== 'ALL' && (
                                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold font-mono">
                                        Class {item.classFilter}
                                      </span>
                                    )}
                                    {item.versionsHistory && item.versionsHistory.length > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono" title={`${item.versionsHistory.length} archived previous versions saved`}>
                                        {item.versionsHistory.length} archived
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <h4 className="font-bold text-sm text-slate-900 mt-1">{item.title}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {item.metaTemplateName || 'admit_card_new'}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                          )}

                          {/* If group link exists, show official WhatsApp group URL preview card */}
                          {item.groupUrl && (
                            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl text-xs">
                              <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                                <LinkIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span className="font-mono text-[11px] text-emerald-950 truncate select-all">
                                  {item.groupUrl}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.groupUrl || '');
                                    setActionSuccessMsg(`Copied group link for ${item.title}`);
                                    setTimeout(() => setActionSuccessMsg(null), 2500);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-900 rounded text-[10px] font-bold border border-emerald-300 transition-colors cursor-pointer"
                                  title="Copy official group link"
                                >
                                  Copy
                                </button>
                                <a
                                  href={item.groupUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center space-x-0.5 transition-colors"
                                  title="Test official group link in WhatsApp"
                                >
                                  <span>Test</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Message Preview in WhatsApp Bubble */}
                          <div className="p-3.5 bg-[#e5ddd5]/50 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-2xs">
                            {previewCandidate && settings
                              ? renderMessageTemplate(item.defaultText, previewCandidate, settings)
                              : item.defaultText}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            {isCustom ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTemplateId(item.id);
                                    setTplTitle(item.title);
                                    setTplDesc(item.description || '');
                                    setTplCategory(item.categoryFilter || 'ALL');
                                    setTplContent(item.defaultText);
                                    setTplMetaName(item.metaTemplateName || 'admit_card_new');
                                    setTemplateModalOpen(true);
                                  }}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                                  title="Edit Template"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTemplate(item.id)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs transition-colors cursor-pointer"
                                  title="Delete Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTemplateId(null);
                                  setTplTitle(`${item.title} (Custom)`);
                                  setTplDesc(`Customized version of ${item.title}`);
                                  setTplCategory(item.categoryFilter || 'ALL');
                                  setTplContent(item.defaultText);
                                  setTplMetaName('admit_card_new');
                                  setTemplateModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Clone and create a customized version of this template"
                              >
                                <Plus className="w-3 h-3 text-slate-500" />
                                <span>Clone / Customize</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleTemplateChange(item.id);
                                setActiveTab('bulk');
                              }}
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>Use in Composer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCampaignTargetTemplate(item.id);
                                if (item.categoryFilter && item.categoryFilter !== 'ALL') {
                                  setCampaignTargetGroup(item.categoryFilter);
                                }
                                if (item.classFilter && item.classFilter !== 'ALL' && item.classFilter !== 'All') {
                                  setCampaignTargetClass(item.classFilter);
                                }
                                setCampaignNameInput(`${item.title} Campaign`);
                                setCampaignModalOpen(true);
                              }}
                              className="py-2 px-3.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-200" />
                              <span>🚀 Launch Campaign</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: COMPLETE MESSAGING & CAMPAIGN HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border border-purple-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-purple-700 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                    Full Audit Trail
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-900">
                    Student-Wise & Campaign-Wise History
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  📊 WhatsApp Campaign & Dispatch History
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Real-time history of all message campaigns dispatched from this admin panel. Every campaign logs the exact competition group, message template, timestamp, operator, and actual API delivery reports (accepted Meta wamid vs exact error code).
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href="/api/whatsapp/export"
                  download
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Full Excel Log</span>
                </a>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Logged WhatsApp Campaigns ({settings?.whatsappCampaigns?.length || 0})
              </h3>
              <span className="text-xs text-slate-500">Chronological history with actual API response status</span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Competition Group</th>
                    <th className="py-3 px-4">Template Used</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4 text-center">Total</th>
                    <th className="py-3 px-4 text-center">Delivered</th>
                    <th className="py-3 px-4 text-center">Failed</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!settings?.whatsappCampaigns || settings.whatsappCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600">No campaigns launched yet</p>
                          <p className="text-[11px] text-slate-400">
                            When you blast messages to a competition group or candidate list, the campaign report and Meta message IDs will be tracked here.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setCampaignTargetGroup('ALL');
                              setCampaignModalOpen(true);
                            }}
                            className="mt-2 px-4 py-2 bg-[#7a0c16] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#5c000b] cursor-pointer"
                          >
                            Launch First Campaign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    settings.whatsappCampaigns.map((camp) => (
                      <tr key={camp.campaignId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{camp.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200 text-[10px]">
                            {camp.competitionGroup}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{camp.templateName}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {camp.dispatchedAt ? new Date(camp.dispatchedAt).toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{camp.dispatchedBy}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{camp.provider}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono">{camp.totalCandidates}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">
                          {camp.succeededCount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-rose-700">
                          {camp.failedCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {camp.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3 mr-0.5" /> COMPLETED
                            </span>
                          ) : camp.status === 'PARTIAL' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              PARTIAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertCircle className="w-3 h-3 mr-0.5" /> FAILED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDIVIDUAL CANDIDATE PREVIEW & CHAT */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Message preview & direct launch */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Personalized Candidate Chat</span>
            </h2>

            {singleStudent && settings ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Candidate Profile</div>
                  <div className="font-bold text-slate-900 text-sm">{singleStudent.name}</div>
                  <div className="font-mono text-emerald-700 font-bold">+91 {singleStudent.phone}</div>
                  <div className="text-[11px] text-slate-500 truncate">{singleStudent.schoolOrCollege}</div>
                  <div className="text-[11px] text-[#7a0c16] font-semibold">Category: {singleStudent.competitionName}</div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-2 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                  {buildStudentWhatsAppMessage(singleStudent, settings, customText)}
                </div>

                <a
                  href={generateWhatsAppLink(
                    singleStudent,
                    settings,
                    buildStudentWhatsAppMessage(singleStudent, settings, customText)
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => updateStudentStatusInDb(singleStudent.studentId, 'OPENED')}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 text-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch WhatsApp Chat</span>
                </a>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a candidate from the table to preview personalized details.
              </div>
            )}
          </div>

          {/* Right: Students Table for Selection */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter candidate name or reg no..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>
              <div className="text-xs text-slate-500">
                {total} total records
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Reg No</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr
                      key={s.studentId}
                      onClick={() => setSingleStudent(s)}
                      className={`cursor-pointer transition-colors ${
                        singleStudent?.studentId === s.studentId ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-[#7a0c16]">{s.registrationNumber}</td>
                      <td className="py-2.5 px-4 text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{s.phone}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {s.whatsappStatus || 'NOT_SENT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-[#7a0c16] font-semibold text-[11px] hover:underline">
                          Select &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BROADCAST & EXPORT TOOLS */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: Comma / Newline Separated Clean Numbers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-sm text-slate-900">WhatsApp Broadcast Numbers</h2>
              </div>
              <span className="text-[11px] text-slate-500">10-Digit clean Indian numbers</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Use these clean phone numbers for creating a <strong>WhatsApp Broadcast List</strong> on your phone or importing into desktop automation software.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Comma-Separated Numbers:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFormattedPhoneList(','))}
                  className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy List</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={getFormattedPhoneList(',')}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Newline-Separated Numbers:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFormattedPhoneList('\n'))}
                  className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy List</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={getFormattedPhoneList('\n')}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all focus:outline-none"
              />
            </div>
          </div>

          {/* Box 2: Full Excel / CSV Dispatch Sheet */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-[#7a0c16]" />
                <h2 className="font-bold text-sm text-slate-900">Export Formatted Dispatch Log</h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export the candidate list complete with individual personalized messages, click-to-chat links, and current dispatch status for records or third-party dispatchers.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-800">Export Columns Included:</div>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                <li>Registration Number & Candidate Name</li>
                <li>Clean 10-Digit Phone (+91 format)</li>
                <li>Individual Click-to-Chat URL with pre-composed text</li>
                <li>School/College & Competition Category</li>
                <li>Full Personalized Message text</li>
                <li>Status (SENT, OPENED, NOT_SENT) & Timestamp</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <form action="/api/whatsapp/export" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="format" value="xlsx" />
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </form>

              <form action="/api/whatsapp/export" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="format" value="csv" />
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV (.csv)</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3B: OFFICIAL WHATSAPP COMMUNITIES (18 PRE-CONFIGURED OFFICIAL GROUPS) */}
      {/* ========================================================================= */}
      {activeTab === 'categoryGroups' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                    18 Official Communities
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-950">
                    Meena Shah Public School &bull; Mind Spark 2026
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  📱 Official WhatsApp Group & Community Manager
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Manage WhatsApp invite links for all 18 official competition and class categories.
                  When messages are dispatched (single, bulk, or campaign), each candidate&apos;s <code>{'{whatsapp_group_link}'}</code> or <code>[DYNAMIC_COMPETITION_GROUP_LINK]</code> automatically resolves to their exact category WhatsApp community link.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddGroupModal}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Group Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToOfficialGroups}
                  disabled={resettingGroups}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Reset all groups to the 18 school-verified defaults"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resettingGroups ? 'animate-spin' : ''}`} />
                  <span>Restore 18 Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCategoryLinks}
                  disabled={savingCategoryLinks}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Fallback</span>
                </button>
              </div>
            </div>

            {/* Default / Fallback Group Link Input */}
            <div className="mt-4 pt-4 border-t border-emerald-200/80 space-y-1.5">
              <label className="block text-xs font-bold text-slate-900">
                General Fallback WhatsApp Group Link *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={defaultGroupLink}
                  onChange={(e) => setDefaultGroupLink(e.target.value.trim())}
                  placeholder="https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L"
                  className="flex-1 p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {defaultGroupLink && (
                  <>
                    <a
                      href={defaultGroupLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(defaultGroupLink);
                        setActionSuccessMsg('Fallback WhatsApp Link copied!');
                        setTimeout(() => setActionSuccessMsg(null), 2500);
                      }}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Used if a candidate has an uncategorized event or if no specific link matches their competition and class.
              </p>
            </div>
          </div>

          {/* Metrics & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search by group name or competition..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <select
                  value={groupFilterComp}
                  onChange={(e) => setGroupFilterComp(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="ALL">All Competitions ({groups.length})</option>
                  {Array.from(new Set(groups.map((g) => g.competition))).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={groupFilterClass}
                  onChange={(e) => setGroupFilterClass(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="ALL">All Class Tiers</option>
                  {availableClassCategories.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 text-xs font-semibold">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                  {groups.filter((g) => {
                    const matchSearch = !groupSearch || g.groupName.toLowerCase().includes(groupSearch.toLowerCase()) || g.competition.toLowerCase().includes(groupSearch.toLowerCase());
                    const matchComp = groupFilterComp === 'ALL' || g.competition === groupFilterComp;
                    const matchClass = groupFilterClass === 'ALL' || g.classRange === groupFilterClass;
                    return matchSearch && matchComp && matchClass;
                  }).length} Groups Displayed
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 font-mono">
                  {groups.reduce((acc, g) => acc + (g.studentCount || 0), 0)} Total Candidates
                </span>
              </div>
            </div>
          </div>

          {/* Groups Grid */}
          {loadingGroups ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading official WhatsApp communities...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups
                .filter((g) => {
                  const matchSearch = !groupSearch || g.groupName.toLowerCase().includes(groupSearch.toLowerCase()) || g.competition.toLowerCase().includes(groupSearch.toLowerCase());
                  const matchComp = groupFilterComp === 'ALL' || g.competition === groupFilterComp;
                  const matchClass = groupFilterClass === 'ALL' || g.classRange === groupFilterClass;
                  return matchSearch && matchComp && matchClass;
                })
                .map((grp, idx) => {
                  return (
                    <div
                      key={grp.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md p-5 flex flex-col justify-between space-y-3.5 transition-all"
                    >
                      <div className="space-y-2.5">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold font-mono">
                              {grp.classRange === 'All' ? 'All Classes' : `Class ${grp.classRange}`}
                            </span>
                            {grp.isOfficial !== false && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center space-x-0.5">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Official</span>
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold font-mono">
                            👥 {grp.studentCount ?? 0} Students
                          </span>
                        </div>

                        {/* Title & Competition */}
                        <div>
                          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                            {grp.competition}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug line-clamp-2" title={grp.groupName}>
                            {grp.groupName}
                          </h3>
                        </div>

                        {grp.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{grp.description}</p>
                        )}

                        {/* WhatsApp URL Box */}
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>WhatsApp Invite Link</span>
                            <span className="font-mono text-emerald-700">chat.whatsapp.com</span>
                          </div>
                          <div className="flex items-center justify-between font-mono text-xs text-slate-800 break-all bg-white p-1.5 rounded border border-slate-200">
                            <span className="truncate mr-2">{grp.url}</span>
                            <button
                              type="button"
                              onClick={() => {
                                copyToClipboard(grp.url);
                                setActionSuccessMsg(`Copied: ${grp.groupName}`);
                                setTimeout(() => setActionSuccessMsg(null), 2500);
                              }}
                              className="text-slate-500 hover:text-emerald-700 p-1 shrink-0"
                              title="Copy Invite Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={grp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                            title="Open WhatsApp Group"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectOfficialGroup(grp.id);
                              setActiveTab('bulk');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                            title="Filter all candidates belonging to this group in the Bulk Desk"
                          >
                            <Users className="w-3 h-3 text-slate-600" />
                            <span>Filter in Desk</span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGroupModal(grp)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs"
                            title="Edit Link"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!grp.isOfficial && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp.id, grp.groupName)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs"
                              title="Delete Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SETTINGS & META CLOUD API CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-base text-slate-900">WhatsApp Automation & API Parameters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure browser queue intervals or connect your official Meta WhatsApp Business Cloud API.
            </p>
          </div>

          {/* Section A: Browser Queue Interval */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
              1. Browser Queue Delay Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Auto-Advance Tab Delay (Seconds)</label>
                <select
                  value={queueIntervalSec}
                  onChange={(e) => setQueueIntervalSec(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value={3}>3 Seconds (Fast)</option>
                  <option value={5}>5 Seconds (Recommended)</option>
                  <option value={8}>8 Seconds (Safe)</option>
                  <option value={10}>10 Seconds (Extra Safe)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Delay between consecutive browser tabs when in Auto-Runner mode.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Official Meta WhatsApp Business Cloud API */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                2. Official Meta WhatsApp Cloud API (Optional)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your Meta Developer WhatsApp Cloud API token to enable 1-click server-side automated bulk delivery.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  WhatsApp Cloud Access Token
                </label>
                <input
                  type="password"
                  value={settings?.whatsappCloudToken || ''}
                  onChange={(e) =>
                    setSettings(settings ? { ...settings, whatsappCloudToken: e.target.value } : null)
                  }
                  placeholder="EAAG... (System User or Permanent Access Token)"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={settings?.whatsappPhoneNumberId || ''}
                  onChange={(e) =>
                    setSettings(settings ? { ...settings, whatsappPhoneNumberId: e.target.value } : null)
                  }
                  placeholder="10987654321..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Status: {settings?.whatsappCloudToken && settings?.whatsappPhoneNumberId ? (
                    <strong className="text-emerald-600">Configured</strong>
                  ) : (
                    <strong className="text-slate-400">Not Configured (Using Browser Queue)</strong>
                  )}
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    if (!settings) return;
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(settings),
                    });
                    setActionSuccessMsg('WhatsApp Cloud API configuration saved.');
                    setTimeout(() => setActionSuccessMsg(null), 3000);
                  }}
                  className="px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Save API Settings
                </button>
              </div>
            </div>
          </div>

          {/* Section C: Meta Approved WhatsApp Template & Dynamic Variable Connector */}
          <div className="space-y-4 pt-5 border-t border-slate-200">
            <div>
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>3. Meta WhatsApp Template & Variable Connector (Official Gateway)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Meta WhatsApp Manager / ICPaaS portal par banaye gaye Template ka Name aur Variables (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;...) yahan connect karein. 100-batch bulk sending me har candidate ka exact data automatically fill hoga.
              </p>
            </div>

            {/* Verified WABA Channel Info Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs">
              <div>
                <span className="text-emerald-700 font-medium text-[10px] block uppercase">WABA Number (Sender):</span>
                <span className="font-mono font-bold text-slate-900 text-xs">+91 8429718299</span>
              </div>
              <div>
                <span className="text-emerald-700 font-medium text-[10px] block uppercase">PhoneNumber ID:</span>
                <span className="font-mono font-bold text-slate-900 text-xs">1346032508598977</span>
              </div>
              <div>
                <span className="text-emerald-700 font-medium text-[10px] block uppercase">WABA Business ID:</span>
                <span className="font-mono font-bold text-slate-900 text-xs">1119511721006574</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-800 font-semibold mb-1">
                  Meta Approved Template Name *
                </label>
                <input
                  type="text"
                  value={metaTemplateName}
                  onChange={(e) => setMetaTemplateName(e.target.value.trim())}
                  placeholder="e.g. admit_card_notice, mindspark_2026_admit"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Jo exact Template Name Meta / ICPaaS portal me approved hua hai.
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1">
                  Template Language
                </label>
                <select
                  value={metaTemplateLang}
                  onChange={(e) => setMetaTemplateLang(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                >
                  <option value="en">English (en)</option>
                  <option value="en_US">English US (en_US)</option>
                  <option value="en_GB">English UK (en_GB)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Template approval ke samay jo language select ki gayi thi.
                </p>
              </div>
            </div>

            {/* Dynamic Variable Mapping List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-semibold text-xs">
                  Meta Template Variables Mapping (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, &#123;&#123;3&#125;&#125;...)
                </label>
                <button
                  type="button"
                  onClick={() => setMetaVariables([...metaVariables, 'name'])}
                  className="text-xs font-bold text-[#7a0c16] hover:underline"
                >
                  + Add Next Variable
                </button>
              </div>

              <div className="space-y-2">
                {metaVariables.map((vField, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <span className="w-16 text-center py-2 px-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold text-slate-800">
                      {`{{${idx + 1}}}`}
                    </span>
                    <span className="text-slate-400 font-bold text-sm">➔</span>
                    <select
                      value={vField}
                      onChange={(e) => {
                        const updated = [...metaVariables];
                        updated[idx] = e.target.value;
                        setMetaVariables(updated);
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                    >
                      <option value="competitionTitle">1. Event Title (Mind Spark Competition- 2026)</option>
                      <option value="participantName">2. Participant Line (Participant Rahul Sharma)</option>
                      <option value="enrollmentNotice">3. Enrollment & Reg No Notice</option>
                      <option value="admitCardInstructions">4. Admit Card Date Notice (After 26th Oct...)</option>
                      <option value="groupLinkNotice">5. Category Group Link Note (Join whatspp group...)</option>
                      <option value="name">Candidate Full Name</option>
                      <option value="registrationNumber">Registration Number</option>
                      <option value="className">Class Name</option>
                      <option value="competitionName">Competition Title / Category</option>
                      <option value="schoolOrCollege">School / College Name</option>
                      <option value="fatherName">Father / Guardian Name</option>
                      <option value="whatsappGroupLink">WhatsApp Group Link (Auto Category Match)</option>
                      <option value="dateOfBirth">Date of Birth (DOB)</option>
                      <option value="admitCardDate">Admit Card Release Date (25 October 2026)</option>
                      <option value="admitCardUrl">Admit Card Direct Download URL</option>
                      <option value="examDate">Examination Date (01 Nov 2026)</option>
                      <option value="reportingTime">Reporting Time (09:00 AM)</option>
                      <option value="venue">Exam Venue (College Campus)</option>
                    </select>
                    {metaVariables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMetaVariables(metaVariables.filter((_, i) => i !== idx));
                        }}
                        className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Remove Variable"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview of Variable Mapping for Real Candidate */}
            {previewCandidate && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                    Live Variable Preview (Sample: {previewCandidate.name})
                  </span>
                  <span className="text-[10px] text-amber-800">Reg: {previewCandidate.registrationNumber}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-900 font-mono pt-1">
                  {metaVariables.map((vField, idx) => {
                    let val = '';
                    if (vField === 'competitionTitle') val = settings?.competitionTitle || 'Mind Spark Competition- 2026';
                    else if (vField === 'participantName') val = `Participant ${previewCandidate.name}`;
                    else if (vField === 'enrollmentNotice') val = `Your form has been successfully enrolled for Mind Spark Competition 2026 This is your Registration Number: ${previewCandidate.registrationNumber}`;
                    else if (vField === 'admitCardInstructions') val = 'After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.';
                    else if (vField === 'groupLinkNotice') val = `Join whatspp group for more update ${getCategoryGroupLink(previewCandidate.competitionName, settings)}`;
                    else if (vField === 'name') val = previewCandidate.name;
                    else if (vField === 'registrationNumber') val = previewCandidate.registrationNumber;
                    else if (vField === 'className') val = previewCandidate.className;
                    else if (vField === 'competitionName') val = previewCandidate.competitionName;
                    else if (vField === 'schoolOrCollege') val = previewCandidate.schoolOrCollege;
                    else if (vField === 'fatherName') val = previewCandidate.fatherName;
                    else if (vField === 'whatsappGroupLink') val = getCategoryGroupLink(previewCandidate.competitionName, settings);
                    else if (vField === 'dateOfBirth') val = previewCandidate.dateOfBirth || '15/08/2012';
                    else if (vField === 'admitCardDate') val = '25 October 2026';
                    else if (vField === 'admitCardUrl') val = `https://.../admit-cards?regNo=${previewCandidate.registrationNumber}`;
                    else if (vField === 'examDate') val = settings?.examDate || '01 Nov 2026';
                    else if (vField === 'reportingTime') val = settings?.reportingTime || '09:00 AM';
                    else if (vField === 'venue') val = settings?.venue || 'MSITM DEGREE COLLEGE GONDA';
                    return (
                      <div key={idx} className="truncate bg-white/70 p-1.5 rounded border border-amber-200/60">
                        <span className="text-amber-700 font-bold">{`{{${idx + 1}}}`}:</span> {val}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={saveMetaTemplateConfig}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Template Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TEST TEACHERS & STAFF ISOLATED REGISTRY */}
      {/* ========================================================================= */}
      {activeTab === 'testStaff' && (
        <div className="space-y-6">
          {/* Security & Isolation Callout */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                    Zero-Duplicacy Guaranteed
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900">
                    Test_Teachers_And_Staff_Registry.xlsx
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Isolated Teachers & Test Staff WhatsApp Registry
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Yeh alag Excel database hai jisme testing ke liye teachers aur staff ke mobile numbers ko rakha jata hai.
                  Koi bhi test message ya dummy number 1,442 students ke mukhya database me nahi jayega,
                  aur kisi bhi mobile number ki duplicacy ko system turant reject kar deta hai.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href="/api/whatsapp/test-staff/export"
                  download
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Test Excel</span>
                </a>

                <button
                  type="button"
                  onClick={fetchTestStaff}
                  disabled={loadingStaff}
                  className="p-2 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold shadow-xs transition-colors"
                  title="Refresh Staff List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStaff ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-200">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Total Test Staff</div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">{testStaffList.length}</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Sent / Delivered</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {testStaffList.filter((s) => s.status === 'SENT').length}
                </div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                <div className="text-lg font-extrabold text-amber-800 mt-0.5">
                  {testStaffList.filter((s) => s.status === 'PENDING').length}
                </div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <div className="text-[10px] font-bold text-rose-700 uppercase">Failed</div>
                <div className="text-lg font-extrabold text-rose-700 mt-0.5">
                  {testStaffList.filter((s) => s.status === 'FAILED').length}
                </div>
              </div>
            </div>
          </div>

          {/* Add Teacher Form */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>➕ Add Teacher / Staff Mobile for Testing</span>
                <span className="text-[11px] font-normal text-slate-500">
                  (Duplicacy Check Enabled)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Teacher ka 10 digit mobile number aur unka naam enter karein. Agar number pehle se mojood hoga to system alert dega.
              </p>
            </div>

            {staffError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-rose-900">Duplicate / Validation Alert:</strong>
                  <span>{staffError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Teacher / Staff Name *
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="e.g. 9795600217"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={newStaffDesignation}
                  onChange={(e) => setNewStaffDesignation(e.target.value)}
                  placeholder="e.g. Senior Teacher / HOD"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  School / Institution
                </label>
                <input
                  type="text"
                  value={newStaffSchool}
                  onChange={(e) => setNewStaffSchool(e.target.value)}
                  placeholder="e.g. Meena Shah Public School"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Save to Test Excel
                </button>
              </div>
            </form>
          </div>

          {/* Test Dispatch Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Dispatch Test Message to Registered Staff
              </h4>
              <p className="text-[11px] text-slate-500">
                Meta template '{metaTemplateName}' ke saath test WhatsApp bhejega aur real-time me Excel aur DB log karega.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDispatchTestStaff}
              disabled={staffDispatching || testStaffList.length === 0}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center space-x-2 transition-colors ${
                staffDispatching || testStaffList.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {staffDispatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching to Staff...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Test WhatsApp ({testStaffList.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Staff Registry Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">
                Registered Teachers & Staff ({testStaffList.length})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Log: Test_Teachers_And_Staff_Registry.xlsx
              </span>
            </div>

            {loadingStaff ? (
              <div className="p-10 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#7a0c16]" />
                <p>Loading Test Staff Registry from Excel...</p>
              </div>
            ) : testStaffList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Koi test staff add nahi hai. Upar diye gaye form se teacher ka naam aur mobile number add karein.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Teacher / Staff Name</th>
                      <th className="py-2.5 px-4">Mobile Number</th>
                      <th className="py-2.5 px-4">Designation & School</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Dispatched At</th>
                      <th className="py-2.5 px-4">Remarks</th>
                      <th className="py-2.5 px-4 text-right">Quick Test</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testStaffList.map((staff, idx) => {
                      const directWaLink = `https://wa.me/91${staff.phone}?text=${encodeURIComponent(
                        `[TEST DISPATCH]\nHello ${staff.name},\nThis is a sample test dispatch from the Examination Council.\nAdmit Card Date: 25 October 2026.`
                      )}`;

                      return (
                        <tr key={staff.phone || idx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {staff.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            +91 {staff.phone}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{staff.designation || 'Staff'}</div>
                            <div className="text-[10px] text-slate-400">{staff.school || 'Meena Shah Public School'}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {staff.status === 'SENT' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 mr-0.5" /> SENT
                              </span>
                            ) : staff.status === 'FAILED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3 mr-0.5" /> FAILED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 mr-0.5" /> PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                            {staff.dispatchedAt ? new Date(staff.dispatchedAt).toLocaleString('en-IN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                            {staff.remarks || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={directWaLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold border border-emerald-200 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open Web</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE QUEUE RUNNER MODAL */}
      {/* ========================================================================= */}
      {isQueueActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">WhatsApp Bulk Dispatch Queue</h3>
                  <p className="text-[10px] text-slate-500">
                    Candidate {Math.min(queueIndex + 1, queueCandidates.length)} of {queueCandidates.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQueueActive(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>
                  Progress: {Math.round((queueIndex / Math.max(1, queueCandidates.length)) * 100)}%
                </span>
                <span className="font-mono text-emerald-700">
                  {queueSentCount} sent &bull; {queueSkippedCount} skipped &bull;{' '}
                  {Math.max(0, queueCandidates.length - queueIndex)} remaining
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((queueIndex / Math.max(1, queueCandidates.length)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Finished State Screen */}
            {queueFinished ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Bulk Dispatch Completed!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Successfully processed all {queueCandidates.length} candidate(s). All statuses have been audited and saved in the database.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQueueActive(false);
                      fetchStudents();
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Done & Close Queue
                  </button>
                </div>
              </div>
            ) : (
              /* Active Candidate Card */
              queueCandidates[queueIndex] && (
                <div className="space-y-4">
                  {/* Mode Selector (Step-by-Step vs Auto-Delay) */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                    <span className="font-semibold text-slate-700">Queue Mode:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setQueueMode('step')}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                          queueMode === 'step' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Operator Step-by-Step
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQueueMode('auto');
                          setQueueCountdown(queueIntervalSec);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                          queueMode === 'auto' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Auto-Delay Timer ({queueIntervalSec}s)
                      </button>
                    </div>
                  </div>

                  {/* Candidate Summary */}
                  <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <div className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                      Current Recipient
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {queueCandidates[queueIndex].name}
                    </div>
                    <div className="font-mono text-emerald-700 font-bold">
                      +91 {queueCandidates[queueIndex].phone} &bull; Reg: {queueCandidates[queueIndex].registrationNumber}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {queueCandidates[queueIndex].schoolOrCollege} &bull; {queueCandidates[queueIndex].competitionName}
                    </div>
                  </div>

                  {/* Auto-delay countdown indicator */}
                  {queueMode === 'auto' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 space-y-1">
                      <div className="font-semibold">
                        Opening next WhatsApp tab in{' '}
                        <strong className="text-base text-amber-900 font-mono">{queueCountdown}</strong> seconds...
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Allow pop-ups in your browser if multiple tabs are requested.
                      </div>
                    </div>
                  )}

                  {/* Dispatch Controls */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleQueueSendAndNext}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {queueMode === 'step'
                          ? `Launch WhatsApp to ${queueCandidates[queueIndex].name.split(' ')[0]} & Next`
                          : 'Send Now (Skip Timer)'}
                      </span>
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      {queueMode === 'auto' && (
                        <button
                          type="button"
                          onClick={() => setIsQueuePaused(!isQueuePaused)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center space-x-1 font-semibold"
                        >
                          {isQueuePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          <span>{isQueuePaused ? 'Resume Timer' : 'Pause Timer'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleQueueSkip}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium ml-auto"
                      >
                        Skip Candidate &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: DYNAMIC TEMPLATE EDITOR MODAL (templateModalOpen)
          ========================================================================= */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#7a0c16]/10 text-[#7a0c16] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTemplateId ? 'Edit WhatsApp Template' : 'Create New Dynamic WhatsApp Template'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize message copy, assign to competition groups, and insert merge tags without modifying code.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTemplateModalOpen(false);
                  setEditingTemplateId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Template Title *
                  </label>
                  <input
                    type="text"
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    placeholder="e.g. Online Quiz Round 1 Confirmation"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7a0c16]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Competition Group
                  </label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#7a0c16]"
                  >
                    <option value="ALL">ALL Competitions (Universal)</option>
                    {(competitions.length > 0 ? competitions : OFFICIAL_COMPETITION_CATEGORIES).map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meta Template Name (WABA)
                  </label>
                  <input
                    type="text"
                    value={tplMetaName}
                    onChange={(e) => setTplMetaName(e.target.value)}
                    placeholder="admit_card_new"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#7a0c16]"
                  />
                  <span className="text-[10px] text-slate-500">
                    Meta WhatsApp Business API approved template name
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Template Description / Notes
                  </label>
                  <input
                    type="text"
                    value={tplDesc}
                    onChange={(e) => setTplDesc(e.target.value)}
                    placeholder="e.g. Sent to quiz participants with registration details"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7a0c16]"
                  />
                </div>
              </div>

              {/* Merge Tags Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Available Merge Tags (Click to append into template):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Replaced automatically per student</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {WHATSAPP_MERGE_TAGS.map(({ tag, label }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTplContent((prev) => prev ? `${prev} ${tag}` : tag)}
                      className="px-2 py-1 bg-white hover:bg-[#7a0c16] hover:text-white text-slate-700 rounded-md text-[11px] font-mono border border-slate-200 shadow-2xs transition-colors flex items-center space-x-1"
                      title={label}
                    >
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    WhatsApp Message Text *
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    {tplContent.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  placeholder="Enter message text... (e.g. Dear {name}, your form has been registered with {reg_no}. Group link: {whatsapp_group_link})"
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#7a0c16] leading-relaxed"
                />
              </div>

              {/* WhatsApp Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Live Preview (Sample Participant)</span>
                </label>
                <div className="p-4 bg-[#efeae2] rounded-xl border border-slate-200">
                  <div className="max-w-md bg-[#d9fdd3] text-slate-800 p-3 rounded-2xl rounded-tl-none shadow-xs text-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {tplContent
                      ? renderMessageTemplate(
                          tplContent,
                          {
                            studentId: 'preview_1',
                            registrationNumber: 'MS261001',
                            name: 'RAHUL SHARMA',
                            fatherName: 'SURESH SHARMA',
                            schoolOrCollege: 'DAV PUBLIC SCHOOL',
                            className: '10',
                            competitionName: tplCategory === 'ALL' ? 'ONLINE QUIZ' : tplCategory,
                            phone: '9876543210',
                            dateOfBirth: '15/08/2012',
                            status: 'ACTIVE',
                            createdAt: new Date().toISOString(),
                            createdBy: 'System',
                            updatedAt: new Date().toISOString(),
                            updatedBy: 'System',
                            dataVersion: 1,
                          },
                          settings
                        )
                      : 'Type template content above to preview message...'}
                    <div className="flex items-center justify-end space-x-1 mt-2 text-[10px] text-slate-500">
                      <span>12:00 PM</span>
                      <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setTemplateModalOpen(false);
                  setEditingTemplateId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !tplTitle.trim() || !tplContent.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#7a0c16] hover:bg-[#5c000b] disabled:bg-slate-300 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                {savingTemplate ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Template...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Publish Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CAMPAIGN LAUNCHER MODAL (campaignModalOpen)
          ========================================================================= */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Launch Targeted WhatsApp Campaign
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch customized WhatsApp messages to targeted competition and class groups.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampaignModalOpen(false);
                  setCampaignResult(null);
                  setCampaignConfirmed(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {campaignResult ? (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-900">
                      Campaign Dispatched Successfully!
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      {campaignResult.message || 'All records have been synchronized to database and Excel log.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-center pt-2">
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <div className="text-base font-bold text-slate-900">{campaignResult.total}</div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Total</div>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <div className="text-base font-bold text-emerald-700">{campaignResult.succeeded}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold uppercase">Sent</div>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <div className="text-base font-bold text-rose-700">{campaignResult.failed}</div>
                      <div className="text-[10px] text-rose-600 font-semibold uppercase">Failed</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignModalOpen(false);
                      setCampaignResult(null);
                      setCampaignConfirmed(false);
                      setActiveTab('history');
                    }}
                    className="mt-4 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    View Campaign Audit Trail &rarr;
                  </button>
                </div>
              ) : (
                <>
                  {/* Campaign Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Campaign Title / Name
                    </label>
                    <input
                      type="text"
                      value={campaignNameInput}
                      onChange={(e) => setCampaignNameInput(e.target.value)}
                      placeholder={`e.g. ${campaignTargetGroup} Blast (${new Date().toLocaleDateString('en-IN')})`}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Quick Select by Official WhatsApp Group */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      📱 Quick Target by Official WhatsApp Group (18 Groups)
                    </label>
                    <select
                      value={campaignTargetOfficialGroup}
                      onChange={(e) => {
                        const grpId = e.target.value;
                        setCampaignTargetOfficialGroup(grpId);
                        if (!grpId) return;
                        const configuredList = groups.length > 0 ? groups : OFFICIAL_WHATSAPP_GROUPS;
                        const g = configuredList.find((item) => item.id === grpId);
                        if (g) {
                          setCampaignTargetGroup(g.competition || 'ALL');
                          setCampaignTargetClass(g.classRange || 'ALL');
                          setCampaignNameInput(`${g.groupName} Blast (${new Date().toLocaleDateString('en-IN')})`);
                          const matchingTpl = OFFICIAL_COMPETITION_TEMPLATES.find((t) => t.groupLinkId === grpId);
                          if (matchingTpl) {
                            setCampaignTargetTemplate(matchingTpl.id);
                          }
                        }
                      }}
                      className="w-full p-2.5 border border-emerald-400 rounded-xl text-xs bg-emerald-50/50 font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="">-- Choose Official Group to Auto-Target (All 18) --</option>
                      <optgroup label="🎓 Online Quiz Communities (Separate Tiers)">
                        <option value="grp_online_quiz_grad">
                          🎓 Online Quiz (Graduation) {groupStats['grp_online_quiz_grad'] ? `(${groupStats['grp_online_quiz_grad'].total} Students)` : ''}
                        </option>
                        <option value="grp_online_quiz_9_10">
                          📚 Online Quiz (Classes 9–10) {groupStats['grp_online_quiz_9_10'] ? `(${groupStats['grp_online_quiz_9_10'].total} Students)` : ''}
                        </option>
                        <option value="grp_online_quiz_11_12">
                          🎓 Online Quiz (Classes 11–12) {groupStats['grp_online_quiz_11_12'] ? `(${groupStats['grp_online_quiz_11_12'].total} Students)` : ''}
                        </option>
                      </optgroup>
                      <optgroup label="🏆 Senior Competitions">
                        <option value="grp_essay_writing">
                          📝 Essay Writing (All Classes) {groupStats['grp_essay_writing'] ? `(${groupStats['grp_essay_writing'].total} Students)` : ''}
                        </option>
                        <option value="grp_writing_quest_11_12">
                          ✍️ Writing Quest (Classes 11–12) {groupStats['grp_writing_quest_11_12'] ? `(${groupStats['grp_writing_quest_11_12'].total} Students)` : ''}
                        </option>
                        <option value="grp_young_innovators_9_10">
                          💡 Young Innovators (Classes 9–10) {groupStats['grp_young_innovators_9_10'] ? `(${groupStats['grp_young_innovators_9_10'].total} Students)` : ''}
                        </option>
                      </optgroup>
                      <optgroup label="🔬 Middle & Primary School">
                        <option value="grp_fireless_cooking_6_8">
                          🍳 Fireless Cooking (Classes 6–8) {groupStats['grp_fireless_cooking_6_8'] ? `(${groupStats['grp_fireless_cooking_6_8'].total} Students)` : ''}
                        </option>
                        <option value="grp_junior_scientist_6_8">
                          🔬 Junior Scientist (Classes 6–8) {groupStats['grp_junior_scientist_6_8'] ? `(${groupStats['grp_junior_scientist_6_8'].total} Students)` : ''}
                        </option>
                        <option value="grp_battle_of_brains_4_5">
                          🧠 Battle of Brains (Classes 4–5) {groupStats['grp_battle_of_brains_4_5'] ? `(${groupStats['grp_battle_of_brains_4_5'].total} Students)` : ''}
                        </option>
                        <option value="grp_poster_artist_4_5">
                          🎨 Poster Artist (Classes 4–5) {groupStats['grp_poster_artist_4_5'] ? `(${groupStats['grp_poster_artist_4_5'].total} Students)` : ''}
                        </option>
                        <option value="grp_paint_your_imagination_2_3">
                          🖌️ Paint Your Imagination (Classes 2–3) {groupStats['grp_paint_your_imagination_2_3'] ? `(${groupStats['grp_paint_your_imagination_2_3'].total} Students)` : ''}
                        </option>
                        <option value="grp_writing_stars_2_3">
                          ⭐ Writing Stars (Classes 2–3) {groupStats['grp_writing_stars_2_3'] ? `(${groupStats['grp_writing_stars_2_3'].total} Students)` : ''}
                        </option>
                        <option value="grp_dress_to_impress_1">
                          👗 Dress To Impress (Class 1) {groupStats['grp_dress_to_impress_1'] ? `(${groupStats['grp_dress_to_impress_1'].total} Students)` : ''}
                        </option>
                        <option value="grp_clay_champs_1">
                          🏺 Clay Champs (Class 1) {groupStats['grp_clay_champs_1'] ? `(${groupStats['grp_clay_champs_1'].total} Students)` : ''}
                        </option>
                      </optgroup>
                      <optgroup label="🎨 Pre-Primary & Kindergarten">
                        <option value="grp_complete_the_picture_ukg">
                          🖼️ Complete The Picture (UKG) {groupStats['grp_complete_the_picture_ukg'] ? `(${groupStats['grp_complete_the_picture_ukg'].total} Students)` : ''}
                        </option>
                        <option value="grp_join_the_dots_lkg">
                          ✏️ Join The Dots (LKG) {groupStats['grp_join_the_dots_lkg'] ? `(${groupStats['grp_join_the_dots_lkg'].total} Students)` : ''}
                        </option>
                        <option value="grp_colour_by_number_nursery">
                          🔢 Colour by Number (Nursery) {groupStats['grp_colour_by_number_nursery'] ? `(${groupStats['grp_colour_by_number_nursery'].total} Students)` : ''}
                        </option>
                        <option value="grp_handmade_fancy_playgroup">
                          🎭 Fancy Design (Play Group) {groupStats['grp_handmade_fancy_playgroup'] ? `(${groupStats['grp_handmade_fancy_playgroup'].total} Students)` : ''}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Target Competition & Class Rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Competition *
                      </label>
                      <select
                        value={campaignTargetGroup}
                        onChange={(e) => {
                          setCampaignTargetGroup(e.target.value);
                          setCampaignTargetOfficialGroup('');
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="ALL">
                          🏆 ALL Competitions ({stats.totalActive} Candidates)
                        </option>
                        {(competitions.length > 0 ? competitions : OFFICIAL_COMPETITION_CATEGORIES).map((comp) => {
                          const cStat = competitionStats[comp];
                          return (
                            <option key={comp} value={comp}>
                              {comp} ({cStat?.total || 0})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Class Range *
                      </label>
                      <select
                        value={campaignTargetClass}
                        onChange={(e) => {
                          setCampaignTargetClass(e.target.value);
                          setCampaignTargetOfficialGroup('');
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="ALL">All Class Tiers</option>
                        {availableClassCategories.map((cls) => {
                          const cStat = classCategoryStats[cls];
                          return (
                            <option key={cls} value={cls}>
                              {cls} {cStat ? `(${cStat.total})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Live Group Link Preview Card */}
                  {(() => {
                    const assignedLink = getCategoryGroupLink(
                      campaignTargetGroup === 'ALL' ? '' : campaignTargetGroup,
                      settings,
                      campaignTargetClass === 'ALL' ? '' : campaignTargetClass
                    );
                    return (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-emerald-950">
                          <span className="flex items-center space-x-1">
                            <LinkIcon className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Assigned WhatsApp Community for Target:</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            {campaignTargetGroup} &bull; {campaignTargetClass}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={assignedLink}
                            className="flex-1 p-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono select-all focus:outline-none text-slate-700"
                          />
                          <a
                            href={assignedLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0"
                          >
                            <span>Test</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[10px] text-emerald-800">
                          All personalized messages for this campaign will dynamically embed this exact community link.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Template Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Message Template to Send
                    </label>
                    <select
                      value={campaignTargetTemplate}
                      onChange={(e) => setCampaignTargetTemplate(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <optgroup label="🌟 Universal Mind Spark Templates">
                        <option value="REGISTRATION_CONFIRMATION">
                          Registration Confirmation (Universal Notice & Link)
                        </option>
                        <option value="ADMIT_CARD_READY">
                          Admit Card Released (Direct Download URL)
                        </option>
                        <option value="EXAM_REMINDER">
                          Exam Day Final Reminder (Date & Venue)
                        </option>
                        <option value="CUSTOM">
                          Custom Announcement
                        </option>
                      </optgroup>
                      <optgroup label="🏆 18 Official Competition-Specific Templates">
                        {OFFICIAL_COMPETITION_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            🏆 {t.title} [{t.categoryFilter} • {t.classFilter}]
                          </option>
                        ))}
                      </optgroup>
                      {customTemplates.length > 0 && (
                        <optgroup label="✏️ Custom Admin Templates">
                          {customTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.title} ({tpl.categoryFilter || 'ALL'}) {tpl.version ? `(v${tpl.version})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {(() => {
                      const rec = getRecommendedTemplateForStudent(
                        { competitionName: campaignTargetGroup === 'ALL' ? undefined : campaignTargetGroup, className: campaignTargetClass === 'ALL' ? undefined : campaignTargetClass },
                        settings
                      );
                      const isMatching = campaignTargetTemplate === rec.id;
                      return (
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="text-slate-500">
                            Recommended: <strong className="text-amber-900">{rec.title}</strong>
                          </span>
                          {!isMatching && (
                            <button
                              type="button"
                              onClick={() => setCampaignTargetTemplate(rec.id)}
                              className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                            >
                              Auto-apply
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Target Candidate Filter */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Audience Filter
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className={`p-3 rounded-xl border flex items-center space-x-2 cursor-pointer transition-colors ${campaignOnlyUnsent ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                        <input
                          type="radio"
                          name="targetAudience"
                          checked={campaignOnlyUnsent}
                          onChange={() => setCampaignOnlyUnsent(true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">Only Unsent / Pending</div>
                          <div className="text-[10px] text-slate-500">Safely skips already sent candidates</div>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border flex items-center space-x-2 cursor-pointer transition-colors ${!campaignOnlyUnsent ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                        <input
                          type="radio"
                          name="targetAudience"
                          checked={!campaignOnlyUnsent}
                          onChange={() => setCampaignOnlyUnsent(false)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">All Candidates in Group</div>
                          <div className="text-[10px] text-slate-500">Includes previously messaged</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Controlled Message Repetition */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePreviousTemplateForResend}
                        onChange={(e) => setUsePreviousTemplateForResend(e.target.checked)}
                        className="mt-0.5 rounded text-[#7a0c16] focus:ring-[#7a0c16]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800">
                          🔁 Controlled Message Repetition (Retain Original Template & Group)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          When resending to candidates who already received a message, resend their previously used template version and original group link by default.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Gateway Provider */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gateway Integration Provider
                    </label>
                    <select
                      value={campaignProvider}
                      onChange={(e) => setCampaignProvider(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="icpaas">
                        ⚡ ICPaaS Gateway v23.0 (Meta Cloud API Endpoint: 1346032508598977) - Recommended
                      </option>
                      <option value="cloud_api">
                        🌐 Official Meta Cloud API (graph.facebook.com)
                      </option>
                      <option value="browser_queue_sync">
                        🖥️ Browser Queue Sync (Interactive WhatsApp Web)
                      </option>
                    </select>
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignConfirmed}
                        onChange={(e) => setCampaignConfirmed(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-amber-950">
                          Confirm Launch Authorization
                        </span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          I verify the target category, template content, and category community link. Launch WhatsApp campaign to eligible candidates.
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!campaignResult && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignModalOpen(false);
                    setCampaignConfirmed(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={launchingCampaign || !campaignConfirmed}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  {launchingCampaign ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Launch WhatsApp Blast &rarr;</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CANDIDATE WHATSAPP HISTORY MODAL (historyModalStudent)
          ========================================================================= */}
      {historyModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#7a0c16]/10 text-[#7a0c16] flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Candidate WhatsApp Audit Trail & History
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {historyModalStudent.name} &bull; Reg: {historyModalStudent.registrationNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Summary Banner */}
            <div className="p-4 bg-amber-50/50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Phone</span>
                <div className="font-mono font-bold text-slate-800">+91 {historyModalStudent.phone}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Event & Class</span>
                <div className="font-semibold text-slate-800 truncate">
                  {historyModalStudent.competitionName} ({normalizeClassCategory(historyModalStudent.className)})
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">School</span>
                <div className="text-slate-700 truncate">{historyModalStudent.schoolOrCollege}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Status</span>
                <div>
                  {historyModalStudent.whatsappStatus === 'SENT' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-3 h-3 mr-0.5" /> SENT
                    </span>
                  ) : historyModalStudent.whatsappStatus === 'FAILED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      <AlertCircle className="w-3 h-3 mr-0.5" /> FAILED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3 mr-0.5" /> PENDING
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* History Records */}
            <div className="p-6 overflow-y-auto space-y-4">
              {Array.isArray(historyModalStudent.messageHistory) && historyModalStudent.messageHistory.length > 0 ? (
                <div className="space-y-4">
                  {historyModalStudent.messageHistory.map((rec: StudentMessageRecord, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#7a0c16]" />
                          <span>{rec.templateName || rec.templateId}</span>
                          {rec.templateVersion && (
                            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-mono text-[10px] font-bold">
                              {typeof rec.templateVersion === 'number' ? `v${rec.templateVersion}` : rec.templateVersion}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(rec.sentAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">Provider:</span>{' '}
                          <span className="font-semibold text-slate-700">{rec.provider || 'WhatsApp Gateway'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Delivery Status:</span>{' '}
                          <span className={`font-bold ${rec.status === 'SENT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {rec.status}
                          </span>
                        </div>
                        {rec.messageId && (
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-400">Meta ID:</span>
                            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-slate-800 truncate max-w-[120px]">
                              {rec.messageId}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rec.messageId || '');
                                setActionSuccessMsg('Meta Message ID copied to clipboard!');
                                setTimeout(() => setActionSuccessMsg(null), 2500);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Copy Meta wamid"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Group Link Record */}
                      {rec.groupLink && (
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px]">
                          <span className="text-emerald-900 font-semibold truncate mr-2">
                            Assigned Group: {rec.groupLink}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <a
                              href={rec.groupLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-emerald-700 hover:text-emerald-900"
                              title="Open Group Link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                copyToClipboard(rec.groupLink || '');
                                setActionSuccessMsg('Group link copied!');
                                setTimeout(() => setActionSuccessMsg(null), 2500);
                              }}
                              className="p-1 text-emerald-700 hover:text-emerald-900"
                              title="Copy Group Link"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Exact Rendered Content Preview */}
                      {rec.messageContent && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            Exact Dispatched Message:
                          </span>
                          <div className="p-3 bg-[#efeae2] rounded-xl border border-slate-200">
                            <div className="max-w-[95%] bg-[#d9fdd3] text-slate-800 p-3 rounded-xl rounded-tl-none shadow-2xs text-xs whitespace-pre-wrap font-sans leading-relaxed">
                              {rec.messageContent}
                              <div className="text-[9px] text-slate-500 text-right mt-1.5 flex items-center justify-end space-x-1">
                                <span>{new Date(rec.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-[#53bdeb] font-bold">&#10003;&#10003;</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {rec.error && (
                        <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-[11px] border border-rose-100 flex items-center space-x-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Error: {rec.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : historyModalStudent.whatsappStatus === 'SENT' ? (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{historyModalStudent.lastTemplateName || 'Registration Confirmation (Mind Spark 2026)'}</span>
                        {historyModalStudent.lastTemplateVersion && (
                          <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded font-mono text-[10px] font-bold">
                            {historyModalStudent.lastTemplateVersion}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700">
                        {historyModalStudent.whatsappSentAt ? new Date(historyModalStudent.whatsappSentAt).toLocaleString('en-IN') : 'Dispatched'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Candidate was recorded as SENT in the database and synchronized with Master Registry.
                    </p>
                    {historyModalStudent.lastGroupLink && (
                      <div className="text-[11px] font-mono text-emerald-800 break-all pt-1">
                        Assigned Link: {historyModalStudent.lastGroupLink}
                      </div>
                    )}
                  </div>

                  {historyModalStudent.lastMessageContent && (
                    <div className="p-3 bg-[#efeae2] rounded-xl border border-slate-200">
                      <div className="max-w-[95%] bg-[#d9fdd3] text-slate-800 p-3 rounded-xl rounded-tl-none text-xs whitespace-pre-wrap font-sans leading-relaxed">
                        {historyModalStudent.lastMessageContent}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-medium text-slate-700">No message dispatches recorded yet</p>
                  <p className="text-[11px] text-slate-400">
                    Launch a campaign or send a direct single message to dispatch WhatsApp to this candidate.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSafeResend(historyModalStudent)}
                  disabled={resendingStudentId === historyModalStudent.studentId}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  title="Resend previous approved template and exact group link"
                >
                  {resendingStudentId === historyModalStudent.studentId ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Resending Message...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>🔁 Safe Resend Previous</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSingleStudent(historyModalStudent);
                    setActiveTab('single');
                    setHistoryModalStudent(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#7a0c16]" />
                  <span>Open in Single Chat &rarr;</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setHistoryModalStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: WHATSAPP GROUP ADD / EDIT MODAL (groupModalOpen)
          ========================================================================= */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingGroup ? 'Edit WhatsApp Community Link' : 'Add New WhatsApp Community Link'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mind Spark 2026 Category-Specific WhatsApp Group
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Group Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  placeholder="e.g. Mind Spark 2026 - Online Quiz (11-12)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Competition Category *
                  </label>
                  <select
                    value={groupFormComp}
                    onChange={(e) => setGroupFormComp(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {(competitions.length > 0 ? competitions : OFFICIAL_COMPETITION_CATEGORIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="All">All Competitions (General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Class Range *
                  </label>
                  <select
                    value={groupFormClass}
                    onChange={(e) => setGroupFormClass(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="All">All Classes (General)</option>
                    {availableClassCategories.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Community Invite URL *
                </label>
                <input
                  type="url"
                  required
                  value={groupFormUrl}
                  onChange={(e) => setGroupFormUrl(e.target.value.trim())}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be an official WhatsApp group invite link starting with <code>https://chat.whatsapp.com/</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={groupFormDesc}
                  onChange={(e) => setGroupFormDesc(e.target.value)}
                  placeholder="e.g. Official WhatsApp community for classes 11 & 12"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center space-x-2"
                >
                  {savingGroup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Community Link...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Community Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
