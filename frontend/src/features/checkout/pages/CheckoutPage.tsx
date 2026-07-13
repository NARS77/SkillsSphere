import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { triggerConfetti } from '../../../components/ui/Confetti';
import { ShieldCheck, CreditCard, Ticket, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { PageLoader } from '../../../components/ui/PageLoader';

export const CheckoutPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [paymentProvider, setPaymentProvider] = useState<'MOCK' | 'STRIPE' | 'RAZORPAY'>('MOCK');
    const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

    // 1. Fetch Course details
    const { data: course, isLoading } = useQuery({
        queryKey: ['checkout-course', courseId],
        queryFn: async () => {
            const res = await api.get(`catalog/${courseId}/`);
            return res.data;
        },
        enabled: !!courseId
    });

    // 2. Validate Coupon Mutation
    const validateCouponMutation = useMutation({
        mutationFn: async (code: string) => {
            const res = await api.post('coupons/validate/', {
                code,
                course_id: courseId
            });
            return res.data;
        },
        onSuccess: (data) => {
            setAppliedCoupon(data);
            toast.success(`Coupon "${data.code}" applied successfully!`);
        },
        onError: () => {
            toast.error('Invalid or expired coupon code.');
            setAppliedCoupon(null);
        }
    });

    // 3. Initiate Checkout & Complete Payment Mutation
    const checkoutMutation = useMutation({
        mutationFn: async () => {
            // First, initiate checkout
            const checkoutRes = await api.post('payments/checkout/', {
                course_ids: [courseId],
                coupon_code: appliedCoupon ? appliedCoupon.code : null
            });
            const order = checkoutRes.data;

            // Simulate small delay for payment gateway verification
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Verify payment
            const verifyRes = await api.post('payments/verify/', {
                order_id: order.id,
                transaction_id: `txn_${Math.random().toString(36).substring(2, 14)}`,
                payment_provider: paymentProvider
            });
            return verifyRes.data;
        },
        onSuccess: (data) => {
            setPaymentSuccess(data);
            toast.success('Payment completed successfully! Enrolled in course.');
            triggerConfetti();
        },
        onError: () => {
            toast.error('Checkout failed. Please try again.');
        }
    });

    if (isLoading) {
        return <PageLoader message="Loading course details..." />;
    }

    if (!course) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">Course not found.</p>
                <Link to="/courses" className="text-brand-600 hover:underline text-xs mt-2 inline-block">Browse Courses</Link>
            </div>
        );
    }

    // Pricing maths
    const subtotal = parseFloat(course.price);
    let discount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.coupon_type === 'PERCENTAGE') {
            discount = subtotal * (parseFloat(appliedCoupon.value) / 100);
        } else {
            discount = parseFloat(appliedCoupon.value);
        }
    }
    const finalTotal = Math.max(0, subtotal - discount);

    if (paymentSuccess) {
        return (
            <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border rounded-3xl shadow-xl text-center space-y-6">
                <div className="mx-auto h-16 w-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Order Confirmed!</h2>
                    <p className="text-xs text-slate-500">Your enrollment is now active.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border rounded-2xl text-left text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Order ID:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{paymentSuccess.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Amount Paid:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">${parseFloat(paymentSuccess.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Course:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{course.title}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {paymentSuccess.receipt_pdf && (
                        <a 
                            href={`${api.defaults.baseURL?.replace('/api/v1/', '')}${paymentSuccess.receipt_pdf}`} 
                            target="_blank" 
                            rel="noreferrer"
                        >
                            <Button variant="outline" className="w-full flex items-center justify-center gap-1.5 text-xs">
                                <FileText className="h-4 w-4" />
                                Download Invoice Receipt (PDF)
                            </Button>
                        </a>
                    )}
                    <Link to={`/courses/${course.slug}/learn`}>
                        <Button className="w-full flex items-center justify-center gap-1 text-xs">
                            Go to Classroom
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
            {checkoutMutation.isPending && (
                <PageLoader message="Processing Payment & Enrollment... Almost Ready..." />
            )}
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Checkout items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 space-y-4">
                        <h2 className="text-base font-bold text-slate-950 dark:text-white">Review Course Details</h2>
                        <div className="flex gap-4">
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt="" className="w-24 h-16 object-cover rounded-lg border" />
                            ) : (
                                <div className="w-24 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">Course</div>
                            )}
                            <div className="flex-1 space-y-1">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{course.title}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2">{course.short_description}</p>
                                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-650 px-2 py-0.5 rounded capitalize">
                                    {course.difficulty?.toLowerCase()}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment methods */}
                    <Card className="p-6 space-y-4">
                        <h2 className="text-base font-bold text-slate-950 dark:text-white">Select Payment Provider</h2>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentProvider('MOCK')}
                                className={`p-4 border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 ${paymentProvider === 'MOCK' ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-950/10' : ''}`}
                            >
                                <CreditCard className="h-6 w-6 text-brand-600" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mock Pay</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentProvider('STRIPE')}
                                className={`p-4 border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 ${paymentProvider === 'STRIPE' ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-950/10' : ''}`}
                            >
                                <CreditCard className="h-6 w-6 text-indigo-600" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Stripe</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentProvider('RAZORPAY')}
                                className={`p-4 border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 ${paymentProvider === 'RAZORPAY' ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-950/10' : ''}`}
                            >
                                <CreditCard className="h-6 w-6 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Razorpay</span>
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Price summary */}
                <div className="space-y-6">
                    <Card className="p-6 space-y-6">
                        <h2 className="text-base font-bold text-slate-950 dark:text-white">Order Summary</h2>

                        {/* Coupon Form */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                <Ticket className="h-3.5 w-3.5" />
                                Apply Coupon Code
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. SAVE15"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    className="text-xs py-1"
                                />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => validateCouponMutation.mutate(couponCode)}
                                    isLoading={validateCouponMutation.isPending}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Pricing details */}
                        <div className="space-y-3 text-xs border-t pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Subtotal:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                            </div>
                            {appliedCoupon && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>Discount ({appliedCoupon.code}):</span>
                                    <span>-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-3 text-sm font-bold">
                                <span className="text-slate-900 dark:text-white">Total Amount:</span>
                                <span className="text-slate-950 dark:text-white">${finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Pay trigger */}
                        <Button 
                            className="w-full flex items-center justify-center gap-1.5"
                            onClick={() => checkoutMutation.mutate()}
                            isLoading={checkoutMutation.isPending}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            {checkoutMutation.isPending ? 'Verifying Transaction...' : 'Complete Payment'}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};
