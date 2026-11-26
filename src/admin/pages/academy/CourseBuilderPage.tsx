import { PublishChecklist } from '../../components/builder/PublishChecklist';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Loader2, ArrowLeft, FileText, CloudUpload, Cloud, AlertCircle, Sparkles, LayoutList, Image, GraduationCap, Library, SlidersHorizontal, MoreHorizontal, X, ExternalLink } from 'lucide-react';
import { useD1Query, adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { CurriculumBuilder } from '../../components/CurriculumBuilder';
import { AssetManagerModal } from '../../components/builder/AssetManagerModal';
import { AiStudioTab } from '../../components/builder/AiStudioTab';
import { AIAssistantWidget } from '../../../components/AIAssistantWidget';

interface Course {
  id: string;
  title: string;
  description: string;
  long_description?: string;
  level: string;
  duration: string;
  price_usd: number;
  price_inr?: number;
  category: string;
  status: string;
  draft_json?: string;
  banner_url?: string;
  thumbnail_url?: string;
  promo_card_url?: string;
  has_certification?: boolean | number;
  certification_name?: string;
  passing_score_overall?: number;
  grading_policy_json?: string;
  subtitle?: string;
  keywords?: string;
  language_tags?: string;
}

interface GradingPolicy {
  assessmentType: 'quizzes_only' | 'assignments_only' | 'hybrid';
  quizWeight: number;
  assignmentWeight: number;
}

const DEFAULT_GRADING_POLICY: GradingPolicy = { assessmentType: 'hybrid', quizWeight: 60, assignmentWeight: 40 };

function parseGradingPolicy(json?: string): GradingPolicy {
  if (!json) return DEFAULT_GRADING_POLICY;
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_GRADING_POLICY, ...parsed };
  } catch {
    return DEFAULT_GRADING_POLICY;
  }
}

export default function CourseBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: courseData, loading, mutate } = useD1Query<Course | { courses: Course[] }>('/academy/courses' + (isNew ? '' : `?id=${id}`));
  
  const [course, setCourse] = useState<Partial<Course>>({
    title: '',
    description: '',
    level: 'Beginner',
    duration: '',
    price_usd: 0,
    category: '',
    status: 'draft'
  });
  
  const [saving, setSaving] = useState(false);
  const [showPublishCheck, setShowPublishCheck] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'branding' | 'curriculum' | 'ai' | 'grading' | 'assets' | 'settings'>('details');

  const gradingPolicy = parseGradingPolicy(course.grading_policy_json);
  const updateGradingPolicy = (patch: Partial<GradingPolicy>) => {
    const next = { ...gradingPolicy, ...patch };
    setCourse(c => ({ ...c, grading_policy_json: JSON.stringify(next) }));
  };
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [assetTargetField, setAssetTargetField] = useState<'banner_url' | 'thumbnail_url' | 'promo_card_url' | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const skipNextAutosave = useRef(true);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isNew && courseData) {
      // Backend returns single course object when id is provided
      const dbCourse = ('title' in courseData) ? courseData : courseData.courses?.[0];
      if (!dbCourse) return;

      skipNextAutosave.current = true;
      if (dbCourse.draft_json) {
        try {
          const draft = JSON.parse(dbCourse.draft_json);
          setCourse({ ...dbCourse, ...draft });
        } catch {
          setCourse(dbCourse);
        }
      } else {
        setCourse(dbCourse);
      }
    }
  }, [courseData, isNew]);

  const handleSave = async (publish = false) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    try {
      setSaving(true);

      const payload = {
        ...course,
        status: publish ? 'published' : 'draft',
      };

      if (isNew) {
        const res = await mutate('POST', payload, '/academy/courses');
        toast.success('Course created successfully!');
        navigate(`/admin/academy/courses/${res.id}`);
      } else {
        skipNextAutosave.current = true;
        await mutate('PUT', payload, '/academy/courses');
        toast.success('Course updated successfully!');
      }
      setAutosaveStatus('saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save course');
      setAutosaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Debounced autosave — fires ~1.2s after the last edit to any course field,
  // skipping the render that follows a programmatic sync from the server
  // (initial load or a manual Save) so it never re-saves unchanged data.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (isNew || !course.id) return;

    setAutosaveStatus('pending');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        setAutosaveStatus('saving');
        skipNextAutosave.current = true;
        await mutate('PUT', { ...course, status: course.status || 'draft' }, '/academy/courses');
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      }
    }, 1200);

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosaveStatus === 'pending' || autosaveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autosaveStatus]);

  const handleBackNavigation = () => {
    if (autosaveStatus === 'pending' || autosaveStatus === 'saving') {
      setShowLeaveWarning(true);
    } else {
      navigate('/admin/academy/courses');
    }
  };

  if (loading && !isNew) return <div className="pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-0 sm:space-y-6 -mx-4 sm:mx-0">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 px-4 py-3 sm:p-0 sm:static sm:bg-transparent border-b border-slate-200 sm:border-0 mb-4 sm:mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <button onClick={handleBackNavigation} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">{isNew ? 'Create New Course' : 'Edit Course: ' + course.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!isNew && (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium px-1 sm:px-3 py-1.5 rounded-full order-last sm:order-none w-full sm:w-auto">
              {autosaveStatus === 'pending' && <span className="text-slate-400 flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Unsaved changes</span>}
              {autosaveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</span>}
              {autosaveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1.5"><CloudUpload className="w-3.5 h-3.5" /> All changes saved</span>}
              {autosaveStatus === 'error' && <span className="text-rose-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Autosave failed</span>}
            </div>
          )}
          {!isNew && course.id && (
            <button
              onClick={() => window.open(`/courses/${course.id}`, '_blank')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-indigo-100 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs sm:text-sm shadow-sm transition-colors"
              title="Preview exactly what students see"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview as student</span>
            </button>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Save Draft</span><span className="sm:hidden">Save</span>
          </button>
          <button
            onClick={() => (isNew ? handleSave(true) : setShowPublishCheck(true))}
            disabled={saving || !course.title}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            Publish<span className="hidden sm:inline"> Course</span>
          </button>
        </div>
      </div>

      <div className="hidden sm:flex gap-3 sm:gap-4 border-b border-slate-200 pb-px overflow-x-auto px-4 sm:px-0">
        {(['details', 'branding', 'curriculum', 'ai', 'grading', 'assets', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
 activeTab === tab
 ? 'border-indigo-600 text-indigo-600'
 : 'border-transparent text-slate-500 hover:text-slate-800'
 }`}
          >
            {tab === 'ai' ? 'AI Studio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white sm:border border-slate-200 sm:rounded-xl p-4 sm:p-6 sm:shadow-sm min-h-[500px] pb-24 sm:pb-6">
        {activeTab === 'details' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Course Title</label>
              <input 
                type="text"
                value={course.title}
                onChange={e => setCourse({ ...course, title: e.target.value })}
                placeholder="e.g. Advanced Negotiation Skills"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Short Description</label>
              <textarea 
                value={course.description}
                onChange={e => setCourse({ ...course, description: e.target.value })}
                rows={3}
                placeholder="A brief summary of the course..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Level</label>
                <select 
                  value={course.level}
                  onChange={e => setCourse({ ...course, level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Duration (Text)</label>
                <input 
                  type="text"
                  value={course.duration}
                  onChange={e => setCourse({ ...course, duration: e.target.value })}
                  placeholder="e.g. 4 Weeks"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="py-6">
            {isNew ? (
              <div className="text-center py-20 text-slate-400">
                <p>Please save the course details first before adding curriculum modules.</p>
              </div>
            ) : (
              <CurriculumBuilder courseId={course.id || ''} courseTitle={course.title} />
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="py-2">
            {isNew ? (
              <div className="text-center py-20 text-slate-400">
                <p>Please save the course details first before generating content.</p>
              </div>
            ) : (
              <AiStudioTab courseId={course.id || ''} />
            )}
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-medium text-slate-800">Visual Branding Customizer</h3>
            <p className="text-sm text-slate-500 mb-4">Upload high-resolution course banners, promotional thumbnails, and marketing preview cards.</p>
            
            <div className="space-y-4">
              {['banner_url', 'thumbnail_url', 'promo_card_url'].map(field => (
                <div key={field} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between bg-slate-50">
                  <div>
                    <h4 className="font-medium text-sm text-slate-800 capitalize">{field.replace('_url', '').replace('_', ' ')}</h4>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{course[field as keyof typeof course] || 'No image selected'}</p>
                  </div>
                  <button 
                    onClick={() => { setAssetTargetField(field as any); setIsAssetManagerOpen(true); }}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-sm transition-colors shadow-sm"
                  >
                    Select Image
                  </button>
                </div>
              ))}
            </div>
            
            {isAssetManagerOpen && (
              <AssetManagerModal 
                onClose={() => setIsAssetManagerOpen(false)}
                onSelect={(url) => {
                  if (assetTargetField) setCourse({ ...course, [assetTargetField]: url });
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'grading' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-medium text-slate-800">Global Grading Configuration</h3>
            <p className="text-sm text-slate-500 mb-4">Configure the overall course passing grade and assign weights to specific quizzes and assignments.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Overall Passing Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={course.passing_score_overall ?? 70}
                  onChange={e => setCourse(c => ({ ...c, passing_score_overall: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Assessment Type</label>
                <select
                  value={gradingPolicy.assessmentType}
                  onChange={e => updateGradingPolicy({ assessmentType: e.target.value as GradingPolicy['assessmentType'] })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="quizzes_only">Quizzes Only</option>
                  <option value="assignments_only">Assignments Only</option>
                  <option value="hybrid">Hybrid (Quizzes & Assignments)</option>
                </select>
              </div>
            </div>

            {gradingPolicy.assessmentType === 'hybrid' && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Weight Distribution</h4>
                <p className="text-xs text-slate-500 mb-4">Define how much each assessment type contributes to the final grade. The two always sum to 100%.</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Quizzes Weight</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={gradingPolicy.quizWeight}
                        onChange={e => {
                          const quizWeight = Number(e.target.value);
                          updateGradingPolicy({ quizWeight, assignmentWeight: 100 - quizWeight });
                        }}
                        className="w-32"
                      />
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">{gradingPolicy.quizWeight}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Assignments Weight</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={gradingPolicy.assignmentWeight}
                        onChange={e => {
                          const assignmentWeight = Number(e.target.value);
                          updateGradingPolicy({ assignmentWeight, quizWeight: 100 - assignmentWeight });
                        }}
                        className="w-32"
                      />
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">{gradingPolicy.assignmentWeight}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-800">Asset Library</h3>
              <p className="text-sm text-slate-500">Every image, video, PDF, and slide deck you've uploaded — reused across all your courses. Click any asset to copy its selection into whatever you're currently editing.</p>
            </div>

            <AssetManagerModal
              inline
              onClose={() => {}}
              onSelect={(url) => {
                navigator.clipboard.writeText(url.startsWith('http') ? url : window.location.origin + url);
                toast.success('Asset URL copied to clipboard');
              }}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={course.price_usd ? course.price_usd / 100 : 0}
                    onChange={e => setCourse({ ...course, price_usd: Math.round(parseFloat(e.target.value) * 100) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pl-8 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Enter 0 for free courses.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Price (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={course.price_inr ? course.price_inr / 100 : 0}
                    onChange={e => setCourse({ ...course, price_inr: Math.round(parseFloat(e.target.value) * 100) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pl-8 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Shown to students browsing in India. Enter 0 for free courses.</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <label className="block text-xs font-medium text-slate-500 mb-2">Subtitle</label>
              <input
                type="text"
                value={course.subtitle || ''}
                onChange={e => setCourse({ ...course, subtitle: e.target.value })}
                placeholder="A short one-line hook shown under the course title"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Keywords / SEO Tags</label>
              <input
                type="text"
                value={course.keywords || ''}
                onChange={e => setCourse({ ...course, keywords: e.target.value })}
                placeholder="e.g. contract law, negotiation, redlining"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated. Used for search and discovery.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Language(s)</label>
              <input
                type="text"
                value={course.language_tags || ''}
                onChange={e => setCourse({ ...course, language_tags: e.target.value })}
                placeholder="e.g. English, Hindi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated. First entry is treated as the primary language.</p>
            </div>

            {!isNew && course.id && <CoursePrerequisitesEditor courseId={course.id} />}

            <div className="border-t border-slate-200 pt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!course.has_certification}
                  onChange={e => setCourse({ ...course, has_certification: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">Offer a certificate on completion</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Students who reach 100% course progress automatically receive a downloadable, verifiable certificate.</span>
                </div>
              </label>
              {course.has_certification && (
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-500 mb-2">Certificate Name (optional)</label>
                  <input
                    type="text"
                    value={course.certification_name || ''}
                    onChange={e => setCourse({ ...course, certification_name: e.target.value })}
                    placeholder="e.g. Certified NDA Redlining Specialist"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Defaults to the course title if left blank.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom controller — app-like tab switching */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch justify-around px-1">
          <button onClick={() => setActiveTab('details')} className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5">
            <FileText className={`w-5 h-5 ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className={`text-[11px] font-medium ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-500'}`}>Details</span>
          </button>
          <button onClick={() => setActiveTab('curriculum')} className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5">
            <LayoutList className={`w-5 h-5 ${activeTab === 'curriculum' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className={`text-[11px] font-medium ${activeTab === 'curriculum' ? 'text-indigo-600' : 'text-slate-500'}`}>Curriculum</span>
          </button>
          <button onClick={() => setActiveTab('ai')} className="flex flex-col items-center justify-end gap-1 flex-1 py-1.5 relative">
            <span className={`absolute -top-5 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors ${
 activeTab === 'ai' ? 'bg-indigo-700' : 'bg-indigo-600'
 }`}>
              <Sparkles className="w-5 h-5 text-white" />
            </span>
            <span className={`text-[11px] font-medium mt-6 ${activeTab === 'ai' ? 'text-indigo-600' : 'text-slate-500'}`}>AI Studio</span>
          </button>
          <button onClick={() => setActiveTab('grading')} className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5">
            <GraduationCap className={`w-5 h-5 ${activeTab === 'grading' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className={`text-[11px] font-medium ${activeTab === 'grading' ? 'text-indigo-600' : 'text-slate-500'}`}>Grading</span>
          </button>
          <button onClick={() => setShowMoreSheet(true)} className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5">
            <MoreHorizontal className={`w-5 h-5 ${['branding', 'assets', 'settings'].includes(activeTab) ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className={`text-[11px] font-medium ${['branding', 'assets', 'settings'].includes(activeTab) ? 'text-indigo-600' : 'text-slate-500'}`}>More</span>
          </button>
        </div>
      </nav>

      {showMoreSheet && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMoreSheet(false)}>
          <div className="bg-white rounded-t-2xl w-full p-4 pb-8 space-y-1 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-800">More Options</h3>
              <button onClick={() => setShowMoreSheet(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            {!isNew && course.id && (
              <button
                onClick={() => { window.open(`/courses/${course.id}`, '_blank'); setShowMoreSheet(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors mb-1"
              >
                <ExternalLink className="w-4 h-4" /> Preview as Student
              </button>
            )}
            {[
              { tab: 'branding', label: 'Branding', icon: Image },
              { tab: 'assets', label: 'Asset Library', icon: Library },
              { tab: 'settings', label: 'Settings', icon: SlidersHorizontal },
            ].map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setShowMoreSheet(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-medium text-sm transition-colors ${
 activeTab === tab ? 'bg-slate-100 text-slate-700' : 'text-slate-700 hover:bg-slate-50'
 }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPublishCheck && course.id && (
        <PublishChecklist
          courseId={course.id}
          onClose={() => setShowPublishCheck(false)}
          onPublish={async (unmet) => {
            setShowPublishCheck(false);
            if (unmet.length) await adminFetch('/academy/course-checklist', { method: 'POST', body: JSON.stringify({ courseId: course.id, unmet }) }).catch(() => { /* the log is best effort */ });
            handleSave(true);
          }}
        />
      )}

      {showLeaveWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
            <h3 className="font-semibold text-lg text-slate-900 mb-2">Unsaved Changes</h3>
            <p className="text-slate-500 text-sm mb-6">You have unsaved changes that will be lost if you leave. Are you sure?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLeaveWarning(false)} className="px-4 py-2 font-medium text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
              <button onClick={() => navigate('/admin/academy/courses')} className="px-4 py-2 font-medium text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm">Leave Anyway</button>
            </div>
          </div>
        </div>
      )}

      <AIAssistantWidget context={{ courseTitle: course.title || 'Draft Course' }} />
    </div>
  );
}

interface PrerequisiteLink {
  id: string;
  prerequisite_course_id: string;
  enforcement: 'hard' | 'soft';
  title: string;
}

function CoursePrerequisitesEditor({ courseId }: { courseId: string }) {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteLink[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enforcement, setEnforcement] = useState<'hard' | 'soft'>('hard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrerequisites = () => {
    adminFetch(`/academy/course-prerequisites?courseId=${courseId}`)
      .then((data: any) => setPrerequisites(data.prerequisites || []))
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch(`/academy/course-prerequisites?courseId=${courseId}`),
      adminFetch('/academy/courses?pageSize=200'),
    ])
      .then(([prereqData, coursesData]: any[]) => {
        setPrerequisites(prereqData.prerequisites || []);
        const others = (coursesData.courses || []).filter((c: any) => c.id !== courseId);
        setAllCourses(others);
        if (others.length > 0) setSelectedCourseId(others[0].id);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const addPrerequisite = async () => {
    if (!selectedCourseId) return;
    setSaving(true);
    try {
      await adminFetch('/academy/course-prerequisites', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, prerequisite_course_id: selectedCourseId, enforcement }),
      });
      toast.success('Prerequisite added');
      fetchPrerequisites();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add prerequisite');
    } finally {
      setSaving(false);
    }
  };

  const removePrerequisite = async (id: string) => {
    try {
      await adminFetch(`/academy/course-prerequisites?id=${id}`, { method: 'DELETE' });
      toast.success('Prerequisite removed');
      fetchPrerequisites();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove prerequisite');
    }
  };

  if (loading) return <div className="border-t border-slate-200 pt-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="border-t border-slate-200 pt-6">
      <label className="block text-xs font-medium text-slate-500 mb-2">Prerequisites</label>
      <p className="text-xs text-slate-500 mb-3">Students must complete these courses first. "Hard" blocks enrollment server-side; "Soft" just shows a dismissible warning.</p>

      {prerequisites.length > 0 && (
        <div className="space-y-2 mb-4">
          {prerequisites.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{p.title}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.enforcement === 'hard' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{p.enforcement}</span>
                <button onClick={() => removePrerequisite(p.id)} className="text-slate-400 hover:text-rose-500 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allCourses.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {allCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={enforcement} onChange={e => setEnforcement(e.target.value as 'hard' | 'soft')} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="hard">Hard (blocks enrollment)</option>
            <option value="soft">Soft (warning only)</option>
          </select>
          <button onClick={addPrerequisite} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm whitespace-nowrap">Add</button>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No other courses available to set as a prerequisite yet.</p>
      )}
    </div>
  );
}
