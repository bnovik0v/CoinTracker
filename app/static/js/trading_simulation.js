document.addEventListener('DOMContentLoaded', () => {
    const openDealsList = document.getElementById('open-deals-list');
    const closedDealsList = document.getElementById('closed-deals-list');
    const API_BASE_URL = '/api';

    const showLoading = (element) => {
        element.innerHTML = '<div class="d-flex justify-content-center align-items-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    };

    const showError = (element, message) => {
        element.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    };

    const renderDeals = (element, deals) => {
        if (!deals || deals.length === 0) {
            element.innerHTML = '<div class="text-center text-body-secondary p-4">No deals to show.</div>';
            return;
        }

        element.innerHTML = deals.map(deal => `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${deal.symbol}</h5>
                    <small>${luxon.DateTime.fromISO(deal.open_time).toFormat('ff')}</small>
                </div>
                <p class="mb-1">Opened at ${deal.open_price} - Current price: ${deal.current_price || 'N/A'}</p>
                <small>Profit: <span class="${deal.profit >= 0 ? 'text-success' : 'text-danger'}">${deal.profit.toFixed(2)}</span></small>
            </div>
        `).join('');
    };

    const fetchDeals = async (is_closed) => {
        const listElement = is_closed ? closedDealsList : openDealsList;
        showLoading(listElement);
        try {
            const response = await fetch(`${API_BASE_URL}/trades?is_closed=${is_closed}`);
            if (!response.ok) throw new Error('Failed to fetch deals');
            const deals = await response.json();
            renderDeals(listElement, deals);
        } catch (error) {
            showError(listElement, error.message);
        }
    };

    fetchDeals(false); // Fetch open deals
    fetchDeals(true);  // Fetch closed deals
});
