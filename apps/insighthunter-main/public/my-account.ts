interface AccountData {
    email: string;
    apps: string[];
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const authApiUrl = 'https://auth.insighthunter.app';
    const welcomeMessage = document.getElementById('welcome-message');
    const appList = document.getElementById('app-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');

    if (!welcomeMessage || !appList || !loadingSpinner || !errorMessage || !logoutBtn) {
        console.error('One or more page elements are missing. Cannot initialize account page.');
        return;
    }

    const fetchAccountInfo = async () => {
        loadingSpinner.style.display = 'block';

        try {
            const response = await fetch(`${authApiUrl}/api/my-account`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Not authenticated or session expired');
            }

            const data: AccountData = await response.json();

            welcomeMessage.textContent = `Welcome, ${data.email}. Here are your available applications:`;

            appList.innerHTML = ''; // Clear previous content
            if (data.apps && data.apps.length > 0) {
                data.apps.forEach((app: string) => {
                    const appCard = document.createElement('div');
                    appCard.className = 'ih-signup-card'; // Reusing styles
                    appCard.style.padding = '1.5rem';
                    appCard.innerHTML = `
                        <h3 style="margin: 0 0 0.5rem;">${app.charAt(0).toUpperCase() + app.slice(1)}</h3>
                        <p style="color: #aaa; margin: 0 0 1rem;">Access the ${app} dashboard.</p>
                        <a href="/apps/${app}" class="ih-btn ih-btn-primary">Launch App</a>
                    `;
                    appList.appendChild(appCard);
                });
            } else {
                welcomeMessage.textContent = 'You currently have no active applications.';
            }

        } catch (error) {
            console.error('Failed to fetch account info:', error);
            errorMessage.style.display = 'block';
            welcomeMessage.style.display = 'none';
            appList.style.display = 'none';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    };

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${authApiUrl}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            window.location.href = '/login.html';
        }
    });

    fetchAccountInfo();
});
