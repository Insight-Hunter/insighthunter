declare const Stripe: any;

document.addEventListener('DOMContentLoaded', async () => {
    const authApiUrl = 'https://auth.insighthunter.app';
    const form = document.getElementById('checkoutForm') as HTMLFormElement;
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
    const radioButtons = document.querySelectorAll('input[name="plan"]');
    const planCards = document.querySelectorAll('.plan-card');

    let stripe: any;

    try {
        const response = await fetch(`${authApiUrl}/api/config`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to load configuration');
        const config = await response.json();
        stripe = Stripe(config.stripePublishableKey);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete setup → Secure checkout';
    } catch (error) {
        console.error('Error loading config:', error);
        submitBtn.textContent = 'Initialization Failed';
        submitBtn.disabled = true;
    }

    // Style selected plan
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            planCards.forEach(card => card.classList.remove('plan-featured'));
            const radioId = (radio as HTMLInputElement).id;
            const selectedCard = document.querySelector(`label[for="${radioId}"]`) as HTMLElement;
            if (selectedCard) {
                selectedCard.closest('.plan-card')?.classList.add('plan-featured');
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const formData = new FormData(form);
        const selectedPlan = formData.get('plan') as string;
        
        if (selectedPlan === 'starter') {
            window.location.href = 'my-account.html';
            return;
        }

        try {
            const response = await fetch(`${authApiUrl}/api/create-checkout`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                const { url } = await response.json();
                if (url) {
                    window.location.href = url;
                } else {
                     throw new Error('No checkout URL received');
                }
            } else {
                const errorText = await response.text();
                alert(`Error: ${errorText}`);
            }
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Could not connect to the checkout service. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Complete setup → Secure checkout';
        }
    });
});
