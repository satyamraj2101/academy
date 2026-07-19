import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { HapticButton } from '../../components/HapticButton';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';
import { toast } from '../../lib/toast';

// Stripe Integration
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Hardcoded for sandbox testing as approved by user
const stripePromise = loadStripe('pk_test_51QHu5rH2lB4ftrTm6P849Sbp6OfvWjnrbnk2WwKIwlqiDPRElbz6wr1uJEQ1daZzqxvX9S8o5GU3kXTKu8YoVAzl00FW8roxWT');

function StripeCheckoutForm({ orderId, providerOrderId, onSuccess }: { orderId: string, providerOrderId: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        const res = await fetch('/api/academy/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, providerOrderId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Payment verification failed');
        onSuccess();
      } catch (err: any) {
        toast.error(err.message);
        setProcessing(false);
      }
    } else {
      toast.error('Unexpected payment status: ' + (paymentIntent?.status || 'Unknown'));
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
        <PaymentElement />
      </div>
      <HapticButton 
        disabled={!stripe || processing}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold text-lg tracking-tight shadow-raised flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
      >
        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay Now
          </>
        )}
      </HapticButton>
    </form>
  );
}

export default function CheckoutPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAcademy();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [couponCode, setCouponCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [checkoutSession, setCheckoutSession] = useState<{ clientSecret: string, orderId: string, providerOrderId: string } | null>(null);

  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [useCredits, setUseCredits] = useState(false);
  const provider = currency === 'INR' ? 'razorpay' : 'stripe';

  // Wallet credits are earned in INR paise and there's no FX conversion path
  // for a USD checkout, so the option only appears for INR purchases.
  const creditsAvailableCents = user?.creditBalance || 0;
  const creditsToApplyCents = currency === 'INR' && useCredits && course
    ? Math.min(creditsAvailableCents, course.price_inr)
    : 0;

  useEffect(() => {
    if (userLoading || !courseId) return;
    fetchCourseData();
  }, [courseId, userLoading]);

  // If currency changes, reset checkout session
  useEffect(() => {
    setCheckoutSession(null);
  }, [currency]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const res = await academyAPI.courses.get(courseId!);
      setCourse(res.course);
      
      if (res.enrollment) {
        navigate(`/courses/${courseId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const goToCourse = async () => {
    try {
      const startRes = await academyAPI.courses.start(courseId!);
      if (startRes?.lessonId) {
        navigate(`/course-player/${courseId}/lesson/${startRes.lessonId}`);
        return;
      }
    } catch {
      // fall through
    }
    navigate(`/courses/${courseId}`);
  };

  const handleCheckout = async () => {
    try {
      setProcessing(true);

      const res = await fetch('/api/academy/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId,
          provider,
          couponCode: couponCode || undefined,
          currency,
          useCreditsCents: creditsToApplyCents,
        })
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to initiate checkout');
      }

      if (orderData.free) {
        setSuccess(true);
        toast.success('Enrollment successful!');
        setTimeout(goToCourse, 2000);
        return;
      }

      if (provider === 'stripe') {
        if (!orderData.clientSecret || orderData.clientSecret.startsWith('mock')) {
          toast.error('Stripe is not configured on the backend');
          setProcessing(false);
          return;
        }
        setCheckoutSession({
          clientSecret: orderData.clientSecret,
          orderId: orderData.orderId,
          providerOrderId: orderData.providerOrderId
        });
        setProcessing(false);
      } else if (provider === 'razorpay') {
        const loadingToastId = toast.loading('Simulating Razorpay checkout for INR...');
        await verifyPayment(orderData.orderId, orderData.providerOrderId, 'mock_signature', 'mock_payment_id', loadingToastId);
      }

    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
      setProcessing(false);
    }
  };

  const verifyPayment = async (orderId: string, providerOrderId: string, providerSignature: string, razorpayPaymentId: string, loadingToastId?: string | number) => {
    try {
      const res = await fetch('/api/academy/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          providerOrderId,
          providerSignature,
          razorpayPaymentId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed');

      toast.dismiss(loadingToastId);
      setSuccess(true);
      toast.success('Payment successful!');
      setTimeout(goToCourse, 2000);
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      toast.error(err.message);
    }
  };

  if (loading || userLoading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (error || !course) return <div className="min-h-screen pt-32 text-center"><p className="text-red-500 font-bold">{error}</p></div>;

  const priceFormatted = currency === 'USD'
    ? `$${(course.price_usd / 100).toFixed(2)}`
    : `₹${(course.price_inr / 100).toFixed(0)}`;

  if (success) {
    return (
      <div className="min-h-screen pt-32 bg-slate-50 dark:bg-slate-950 flex justify-center items-start">
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-card p-12 text-center shadow-floating max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Enrollment Successful!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">You now have full access to {course.title}. Redirecting you to the course player...</p>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>Checkout | SpotCLM Academy</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Course Details
        </button>
        
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Order Summary */}
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Order Summary</h1>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6 shadow-sm mb-6">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=300&auto=format&fit=crop" alt="Course" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2">{course.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{course.description}</p>
                </div>
              </div>
              
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-600 dark:text-slate-400">Price</span>
                  <span className="font-bold text-slate-900 dark:text-white">{priceFormatted}</span>
                </div>
                {creditsToApplyCents > 0 && (
                  <div className="flex justify-between items-center mb-3 text-emerald-600 dark:text-emerald-400">
                    <span>Wallet Credit Applied</span>
                    <span className="font-bold">−₹{(creditsToApplyCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-black mt-6">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {currency === 'INR' ? `₹${((course.price_inr - creditsToApplyCents) / 100).toFixed(0)}` : priceFormatted}
                  </span>
                </div>
              </div>
            </div>

            {currency === 'INR' && creditsAvailableCents > 0 && (
              <label className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-sm mb-6 cursor-pointer">
                <input type="checkbox" checked={useCredits} onChange={e => setUseCredits(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Use my wallet balance (₹{(creditsAvailableCents / 100).toFixed(2)} available)
                </span>
              </label>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>30-day money-back guarantee</span>
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Payment Details</h2>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6 shadow-sm">
              
              {!checkoutSession ? (
                <>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Currency</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
                      <button 
                        onClick={() => setCurrency('USD')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${currency === 'USD' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        USD ($)
                      </button>
                      <button 
                        onClick={() => setCurrency('INR')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${currency === 'INR' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        INR (₹)
                      </button>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Coupon Code (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-control px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        disabled
                        title="Coupon is validated automatically when you complete checkout"
                        className="px-4 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-control font-bold text-sm cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Your code is checked and the discount applied when you complete checkout below.</p>
                  </div>

                  <HapticButton 
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold text-lg tracking-tight shadow-raised flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  >
                    {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Proceed to Payment
                      </>
                    )}
                  </HapticButton>
                  <p className="text-center text-xs text-slate-400 mt-4">
                    Payments are securely processed by {currency === 'USD' ? 'Stripe' : 'Razorpay'}.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">Enter Card Details</h3>
                    <button 
                      onClick={() => setCheckoutSession(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret: checkoutSession.clientSecret,
                      appearance: {
                        theme: 'flat',
                        variables: {
                          colorPrimary: '#4f46e5',
                        }
                      }
                    }}
                  >
                    <StripeCheckoutForm 
                      orderId={checkoutSession.orderId}
                      providerOrderId={checkoutSession.providerOrderId}
                      onSuccess={() => {
                        setSuccess(true);
                        toast.success('Payment successful!');
                        setTimeout(goToCourse, 2000);
                      }}
                    />
                  </Elements>
                </>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
