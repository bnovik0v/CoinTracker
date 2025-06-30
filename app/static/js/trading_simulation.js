//
// File: /home/borislav/VSCode/CoinTracker/app/static/js/trading_simulation.js
//
document.addEventListener('DOMContentLoaded', () => {
    const openDealsList = document.getElementById('open-deals-list');
    const closedDealsList = document.getElementById('closed-deals-list');
    const showMoreOpenBtn = document.getElementById('show-more-open');
    const showMoreClosedBtn = document.getElementById('show-more-closed');
    
    const API_BASE_URL = '/api';
    const DEAL_LIMIT = 10;
    
    let openDealsPage = 0;
    let closedDealsPage = 0;

    const formatPrice = (price) => {
        if (price === null || price === undefined) return 'N/A';
        const absPrice = Math.abs(price);
        if (absPrice > 0 && absPrice < 0.01) {
            return price.toPrecision(4);
        }
        return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const showLoading = (element) => {
        element.innerHTML = '<div class="d-flex justify-content-center align-items-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    };

    const renderDeals = (element, deals, isClosed) => {
        if (deals.length === 0 && (isClosed ? closedDealsPage : openDealsPage) === 0) {
            element.innerHTML = '<div class="text-center text-body-secondary p-4">No deals to show.</div>';
            return;
        }

        const dealsHtml = deals.map(deal => {
            const buyDate = luxon.DateTime.fromISO(deal.buy_date).toFormat('ff');
            let dealDetailsHtml;

            if (isClosed) {
                const sellDate = luxon.DateTime.fromISO(deal.sell_date).toFormat('ff');
                const profitValue = deal.profit;
                const profitPercent = deal.profit_percent;

                const profitClass = profitValue > 0 ? 'profit-positive' : (profitValue < 0 ? 'profit-negative' : 'profit-neutral');
                const profitValueText = profitValue !== null ? `${formatPrice(profitValue)} USD` : 'N/A';
                const profitPercentText = profitPercent !== null ? `(${profitPercent.toFixed(2)}%)` : '';

                dealDetailsHtml = `
                    <p class="mb-1 small text-body-secondary">Bought: ${formatPrice(deal.buy_price)} USD on ${buyDate}</p>
                    <p class="mb-1 small text-body-secondary">Sold: ${formatPrice(deal.sell_price)} USD on ${sellDate}</p>
                    <p class="mb-0 mt-2"><strong>Profit: <span class="${profitClass}">${profitValueText} ${profitPercentText}</span></strong></p>
                `;
            } else {
                dealDetailsHtml = `
                    <p class="mb-1 small text-body-secondary">Opened: ${buyDate}</p>
                    <p class="mb-0 mt-2"><strong>Buy Price: ${formatPrice(deal.buy_price)} USD</strong></p>
                    <p class="mb-0 mt-2 text-body-secondary"><em>Trade is still open...</em></p>
                `;
            }

            return `
                <div class="deal-card">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${deal.coin_name}</h5>
                    </div>
                    ${dealDetailsHtml}
                </div>
            `;
        }).join('');

        if ((isClosed ? closedDealsPage : openDealsPage) === 0) {
            element.innerHTML = dealsHtml;
        } else {
            element.insertAdjacentHTML('beforeend', dealsHtml);
        }
    };

    const fetchDeals = async (isClosed) => {
        const page = isClosed ? closedDealsPage : openDealsPage;
        const listElement = isClosed ? closedDealsList : openDealsList;
        const buttonElement = isClosed ? showMoreClosedBtn : showMoreOpenBtn;
        
        if (page === 0) {
            showLoading(listElement);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/trades?is_closed=${isClosed}&limit=${DEAL_LIMIT}&skip=${page * DEAL_LIMIT}`);
            if (!response.ok) throw new Error('Failed to fetch deals');
            const deals = await response.json();
            
            renderDeals(listElement, deals, isClosed);

            if (deals.length < DEAL_LIMIT) {
                buttonElement.style.display = 'none';
            } else {
                buttonElement.style.display = 'block';
            }
        } catch (error) {
            listElement.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    };

    showMoreOpenBtn.addEventListener('click', () => {
        openDealsPage++;
        fetchDeals(false);
    });

    showMoreClosedBtn.addEventListener('click', () => {
        closedDealsPage++;
        fetchDeals(true);
    });

    // Initial fetch
    fetchDeals(false);
    fetchDeals(true);
});