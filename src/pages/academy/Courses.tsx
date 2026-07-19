import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { BottomCTA } from '../shared';
import { HapticButton } from '../../components/HapticButton';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { Loader2, BookOpen, Star, Users, Clock, Layers, Search, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function CoursesComponent({ onOpenProposalModal }: { onOpenProposalModal: (service?: string) => void }) {
  const navigate = useNavigate();
  const { user } = useAcademy();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-courses'>('catalog');
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<any>(null);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCourses = academyAPI.courses.list();
    const fetchEnrollments = user ? academyAPI.enrollments.list().catch(() => null) : Promise.resolve(null);
    
    Promise.all([fetchCourses, fetchEnrollments])
      .then(([resCourses, resEnrollments]) => {
        if (resCourses?.success) setCourses(resCourses.courses);
        if (resEnrollments?.success) setEnrollments(resEnrollments.enrollments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
  
  const catalogCourses = courses.filter(c => !enrolledCourseIds.has(c.id));
  
  const filteredCourses = catalogCourses.filter(c => {
    if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
    if (selectedLevel !== 'All' && c.level !== selectedLevel) return false;
    if (searchQuery.trim() && !`${c.title} ${c.description}`.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet>
        <title>Course Catalog | SpotCLM Academy</title>
      </Helmet>

      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-12 mb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Course Catalog</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Master contract lifecycle management with role-based certifications and expert-led training.
          </p>
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'catalog' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Course Catalog
            </button>
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'my-courses' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Courses
              {enrollments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'my-courses' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {enrollments.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Filters (only for catalog) */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-card border border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-control pl-9 pr-4 py-2 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="flex-1 md:w-48 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-control px-4 py-2 text-sm font-semibold outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="flex-1 md:w-48 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-control px-4 py-2 text-sm font-semibold outline-none"
              >
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : activeTab === 'catalog' ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCourses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="group flex flex-col bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-1.5 backdrop-blur-sm"
                >
                  <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10" />
                    {course.image_url && <img src={course.image_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" />}
                    <div className="absolute top-3 left-3 flex gap-2 z-20">
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-white/95 dark:bg-slate-900/95 text-indigo-600 dark:text-indigo-400 shadow-sm border border-white/20 dark:border-slate-700/50">
                        {course.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-md"><Layers className="w-3.5 h-3.5 text-indigo-500" /> {course.level}</span>
                      <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-md"><Clock className="w-3.5 h-3.5 text-amber-500" /> {course.duration}</span>
                    </div>

                    <h3 className="text-lg font-black mb-2 text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h3>

                    {course.prerequisites?.length > 0 && (
                      <span className="inline-flex items-center gap-1 self-start text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 px-2 py-1 rounded-md mb-3">
                        <Lock className="w-3 h-3" /> Requires: {course.prerequisites[0].title}{course.prerequisites.length > 1 ? ` +${course.prerequisites.length - 1} more` : ''}
                      </span>
                    )}

                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 mt-auto pt-2">
                      {course.review_count > 0 ? (
                        <span className="flex items-center gap-1 text-amber-500"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {course.avg_rating.toFixed(1)} <span className="text-slate-400 dark:text-slate-500">({course.review_count})</span></span>
                      ) : (
                        <span className="flex items-center gap-1 text-indigo-500"><Star className="w-3.5 h-3.5" /> New</span>
                      )}
                      {course.enrollment_count > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollment_count.toLocaleString()}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        ${(course.price_usd / 100).toLocaleString()}
                      </span>
                      <HapticButton 
                        onClick={(e: any) => { e.stopPropagation(); setSelectedCourseForModal(course); }}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Quick View
                      </HapticButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredCourses.length === 0 && (
              <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-card border border-slate-200 dark:border-slate-800 border-dashed">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-1">No courses found</h3>
                <p className="text-sm text-slate-500">Try adjusting your filters.</p>
              </div>
            )}
          </>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {enrollments.map((enr: any) => (
              <div key={enr.enrollment_id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1">
                <div className="h-36 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent z-10" />
                  {enr.image_url ? (
                    <img src={enr.image_url} alt={enr.title} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 z-20">
                    <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
                      Enrolled
                    </span>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-base font-bold mb-4 text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{enr.title}</h3>
                  
                  <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{enr.progress_percent}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${enr.progress_percent}%` }} />
                    </div>
                    
                    <HapticButton 
                      onClick={async () => {
                        try {
                          const startRes = await academyAPI.courses.start(enr.course_id);
                          if (startRes?.lessonId) {
                            navigate(`/course-player/${enr.course_id}/lesson/${startRes.lessonId}`);
                          } else {
                            navigate(`/courses/${enr.course_id}`);
                          }
                        } catch {
                          navigate(`/courses/${enr.course_id}`);
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold text-sm transition-all shadow-sm flex items-center justify-center"
                    >
                      {enr.progress_percent === 100 ? 'Review Course' : 'Resume Course'}
                    </HapticButton>
                  </div>
                </div>
              </div>
            ))}
            {enrollments.length === 0 && (
              <div className="col-span-full text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-card border border-slate-200 dark:border-slate-800 border-dashed">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-1">No enrolled courses</h3>
                <p className="text-sm text-slate-500 mb-4">Start learning by exploring the course catalog.</p>
                <HapticButton onClick={() => setActiveTab('catalog')} className="text-indigo-600 font-bold hover:underline">Explore Catalog</HapticButton>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomCTA onOpenProposalModal={onOpenProposalModal} />

        <AnimatePresence>
          {selectedCourseForModal && createPortal(
            <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                onClick={() => setSelectedCourseForModal(null)} 
              />
              <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="h-64 relative shrink-0 bg-slate-100 dark:bg-slate-800">
                  {selectedCourseForModal.image_url ? (
                    <img src={selectedCourseForModal.image_url} alt={selectedCourseForModal.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-6">
                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-indigo-600 text-white w-fit mb-3 shadow-sm">
                      {selectedCourseForModal.category}
                    </span>
                    <h2 className="text-2xl font-black text-white leading-tight">{selectedCourseForModal.title}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedCourseForModal(null)}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50"><Layers className="w-3.5 h-3.5 text-indigo-500" /> {selectedCourseForModal.level}</span>
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50"><Clock className="w-3.5 h-3.5 text-amber-500" /> {selectedCourseForModal.duration}</span>
                    {selectedCourseForModal.review_count > 0 && (
                      <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {selectedCourseForModal.avg_rating.toFixed(1)}</span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm uppercase tracking-wider">Course Overview</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8 flex-1">
                    {selectedCourseForModal.description}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900 sticky bottom-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Total Price</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1 tracking-tight">
                          ${(selectedCourseForModal.price_usd / 100).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <HapticButton 
                      onClick={() => {
                        if (!user) {
                          navigate('/login');
                        } else {
                          navigate(`/courses/${selectedCourseForModal.id}`);
                        }
                      }}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" /> Enroll Now
                    </HapticButton>
                  </div>
                </div>
              </motion.div>
            </div>,
            document.body
          )}
        </AnimatePresence>
    </div>
  );
}
