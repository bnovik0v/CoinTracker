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

    const renderDeals = (element, deals, isClosed) => {
        if (!deals || deals.length === 0) {
            element.innerHTML = '<div class="text-center text-body-secondary p-4">No deals to show.</div>';
            return;
        }

        element.innerHTML = deals.map(deal => {
            const buyDate = luxon.DateTime.fromISO(deal.buy_date).toFormat('ff');
            let dealHtml;

            if (isClosed) {
                const sellDate = luxon.DateTime.fromISO(deal.sell_date).toFormat('ff');
                const profitClass = deal.profit > 0 ? 'text-success' : (deal.profit < 0 ? 'text-danger' : 'text-secondary');
                const profitText = deal.profit !== null ? `${deal.profit.toFixed(2)} USD` : 'N/A';

                dealHtml = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${deal.coin_name}</h5>
                        <small class="text-body-secondary">Closed: ${sellDate}</small>
                    </div>
                    <p class="mb-1">Bought at ${deal.buy_price.toFixed(2)} on ${buyDate}</p>
                    <p class="mb-1">Sold at ${deal.sell_price.toFixed(2)}</p>
                    <p class="mb-0"><strong>Profit:</strong> <span class="${profitClass}">${profitText}</span></p>
                `;
            } else { // Open deals
                dealHtml = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${deal.coin_name}</h5>
                        <small class="text-body-secondary">Opened: ${buyDate}</small>
                    </div>
                    <p class="mb-1">Bought at ${deal.buy_price.toFixed(2)}</p>
                    <p class="mb-0 text-body-secondary"><em>(Trade is still open)</em></p>
                `;
            }
            
            return `<div class="list-group-item">${dealHtml}</div>`;
        }).join('');
    };

    const fetchDeals = async (is_closed) => {
        const listElement = is_closed ? closedDealsList : openDealsList;
        showLoading(listElement);
        try {
            const response = await fetch(`${API_BASE_URL}/trades?is_closed=${is_closed}`);
            if (!response.ok) throw new Error('Failed to fetch deals');
            const deals = await response.json();
            renderDeals(listElement, deals, is_closed);
        } catch (error) {
            showError(listElement, error.message);
        }
    };

    fetchDeals(false); // Fetch open deals
    fetchDeals(true);  // Fetch closed deals
});
