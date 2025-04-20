import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import axios from '@/lib/axios';

interface ProPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProPlanDialog({ isOpen, onClose }: ProPlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const token = localStorage.getItem('token');

  const plans = [
    {
      name: 'Monthly',
      price: '₹499',
      amount: 499, // Amount in rupees (converted to paise in payment)
      period: 'month',
      features: [
        'Private projects',
        'Unlimited projects',
        'Priority support',
        'Advanced analytics',
        'Custom domains',
      ],
    },
    {
      name: 'Yearly',
      price: '₹4,999',
      amount: 4999, // Amount in rupees (converted to paise in payment)
      period: 'year',
      features: [
        'Private projects',
        'Unlimited projects',
        'Priority support',
        'Advanced analytics',
        'Custom domains',
        '2 months free',
      ],
    },
  ];

  // Fetch user data on mount
  useEffect(() => {
    const getUserData = async () => {
      try {
        const res = await axios.get(`/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data) {
          setUserData(res.data);
        }
      } catch (error) {
        setNotification({ show: true, message: 'Error fetching user', type: 'error' });
      }
    };

    if (token) {
      getUserData();
    } else {
      setNotification({ show: true, message: 'Please log in to proceed', type: 'error' });
    }
  }, [token]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Load Razorpay SDK
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) throw new Error('Failed to load Razorpay');

      // 2. Get selected plan details
      const plan = plans.find((p) => p.name.toLowerCase() === selectedPlan);
      if (!plan) throw new Error('Invalid plan selected');

      // 3. Generate receipt ID
      const receiptId = uuidv4();

      // 4. Initialize Razorpay checkout (no backend order creation)
      const options = {
        key: 'rzp_test_y6rhmgP580s3Yc', // Replace with your Razorpay key
        amount: plan.amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Sonic',
        description: `${plan.name} Subscription`,
        image: '/logo.png',
        handler: async (response: any) => {
          try {
            // 5. Save payment details to the database
            const paymentData = {
              user: userData?._id,
              rupees: plan.amount,
              transaction_id: response.razorpay_payment_id,
              plan: selectedPlan,
              receipt_id: receiptId,
              currency: 'INR',
              status: 'success',
              created_at: new Date().toISOString(),
            };

            await axios.post(`/users/payment/save`, paymentData, {
              headers: { Authorization: `Bearer ${token}` },
            });

            // Update local storage (similar to Subscriptions)
            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser) {
              storedUser.user_type = 'subscriber';
              localStorage.setItem('user', JSON.stringify(storedUser));
            }

            setNotification({
              show: true,
              message: 'Payment Successful! You are now a Premium Member 🎉',
              type: 'success',
            });
            onClose();
            window.location.href = '/thank-you';
          } catch (error) {
            console.error('Failed to save payment:', error);
            setNotification({
              show: true,
              message: 'Payment successful, but there was an issue saving the details.',
              type: 'error',
            });
          }
        },
        prefill: {
          name: userData?.name || 'Your Name',
          email: userData?.email || 'user@example.com',
          contact: userData?.phone_number || '9999999999',
        },
        notes: {
          receipt_id: receiptId,
          plan: selectedPlan,
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', async (response: any) => {
        // 6. Save failed payment details
        try {
          const paymentData = {
            user: userData?._id,
            rupees: plan.amount,
            transaction_id: response.error.metadata?.payment_id || '',
            plan: selectedPlan,
            receipt_id: receiptId,
            currency: 'INR',
            status: 'failed',
            error_code: response.error.code,
            error_description: response.error.description,
            created_at: new Date().toISOString(),
          };

          await axios.post(`${api.Url}/user/payment/save`, paymentData, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          console.error('Failed to save failed payment:', error);
        }
        setNotification({
          show: true,
          message: `Payment failed: ${response.error.description}`,
          type: 'error',
        });
      });
    } catch (error) {
      console.error('Payment error:', error);
      setNotification({
        show: true,
        message: 'Payment initialization failed. Please try again.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-center">
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        {/* Notification */}
        {notification.show && (
          <div
            className={`p-3 rounded-md mb-4 ${
              notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {notification.message}
            <button
              className="ml-2 text-sm underline"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              Close
            </button>
          </div>
        )}

        {/* Plan selector */}
        <div className="flex justify-center gap-2 my-4 p-1 bg-muted rounded-lg max-w-md mx-auto">
          {plans.map((plan) => (
            <Button
              key={plan.name}
              variant={selectedPlan === plan.name.toLowerCase() ? 'default' : 'ghost'}
              onClick={() => setSelectedPlan(plan.name.toLowerCase() as 'monthly' | 'yearly')}
              className={`flex-1 rounded-md px-3 py-1 text-sm ${
                selectedPlan === plan.name.toLowerCase() ? 'shadow-sm' : ''
              }`}
            >
              {plan.name}
              {plan.name === 'Yearly' && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  Save 17%
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-5 rounded-xl border transition-all ${
                selectedPlan === plan.name.toLowerCase()
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name} Plan</h3>
                    <div className="flex items-baseline mt-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm ml-1">/{plan.period}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedPlan === plan.name.toLowerCase() ? 'default' : 'outline'}
                    onClick={() => setSelectedPlan(plan.name.toLowerCase() as 'monthly' | 'yearly')}
                    className="mt-1 h-8 px-3"
                  >
                    {selectedPlan === plan.name.toLowerCase() ? 'Selected' : 'Select'}
                  </Button>
                </div>

                <ul className="space-y-3 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Payment button */}
        <div className="mt-6">
          <Button
            className="w-full py-3 text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            onClick={initiatePayment}
            disabled={isProcessing || !userData}
          >
            {isProcessing ? 'Processing...' : `Pay Now - ${selectedPlan === 'monthly' ? '₹499' : '₹4,999'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}