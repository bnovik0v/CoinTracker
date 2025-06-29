document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const timeRangeSelector = document.getElementById('time-range-selector');
    const tokenSearchInput = document.getElementById('token-search-input');
    const tokenSearchBtn = document.getElementById('token-search-btn');
    const topTokensList = document.getElementById('top-tokens-list');
    const tokenInfoDetails = document.getElementById('token-info-details');
    const latestTweetsList = document.getElementById('latest-tweets-list');
    const tokenDetailsSection = document.getElementById('token-details-section');
    const tokenPlaceholder = document.getElementById('token-placeholder');

    // --- State ---
    let sentimentChart = null;
    const API_BASE_URL = '/api';

    // --- Utility Functions ---
    const showLoading = (element) => {
        element.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;
    };

    const showError = (element, message) => {
        element.innerHTML = `
            <div class="alert alert-danger m-0" role="alert">
                <i class="bi bi-exclamation-triangle-fill"></i> ${message}
            </div>`;
    };

    const hideLoading = (element) => {
        // Remove any loading spinners from the element
        const spinners = element.querySelectorAll('.spinner-border');
        spinners.forEach(spinner => {
            const spinnerContainer = spinner.closest('.d-flex.justify-content-center.align-items-center.py-5');
            if (spinnerContainer) {
                spinnerContainer.remove();
            }
        });
    };

    // --- Data Fetching & Rendering ---
    const fetchTopTokens = async () => {
        showLoading(topTokensList);
        const selectedRange = document.querySelector('input[name="timeRange"]:checked').dataset.range;
        try {
            const response = await fetch(`${API_BASE_URL}/tokens/top?time_range=${selectedRange}&limit=30`);
            if (!response.ok) throw new Error('Network response was not ok');
            const tokens = await response.json();
            renderTopTokens(tokens);
        } catch (error) {
            console.error('Error fetching top tokens:', error);
            showError(topTokensList, 'Could not load top tokens.');
        }
    };

    const renderTopTokens = (tokens) => {
        if (!tokens || tokens.length === 0) {
            topTokensList.innerHTML = '<p class="text-center text-body-secondary p-3">No tokens found.</p>';
            return;
        }

        const getBadgeClass = (score) => {
            if (score > 0) return 'bg-success';
            if (score < 0) return 'bg-danger';
            return 'bg-secondary';
        };

        topTokensList.innerHTML = `
            <div class="list-group list-group-flush">
                ${tokens.map(token => `
                    <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-coin-name="${token.coin_name}">
                        <span class="fw-bold">${token.coin_name}</span>
                        <span class="badge ${getBadgeClass(token.score)} rounded-pill">${token.score > 0 ? '+' : ''}${token.score}</span>
                    </a>
                `).join('')}
            </div>`;

        document.querySelectorAll('#top-tokens-list a').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const coinName = e.currentTarget.dataset.coinName;
                tokenSearchInput.value = coinName;
                fetchAllTokenData(coinName);
            });
        });
    };

    const fetchAllTokenData = async (coinName) => {
        if (!coinName) return;

        tokenPlaceholder.classList.add('d-none');
        tokenDetailsSection.classList.remove('d-none');

        showLoading(tokenInfoDetails);
        showLoading(latestTweetsList);
        
        // Make sure the chart container exists and show loading state
        // Find the card body that contains the sentiment chart
        const chartContainers = document.querySelectorAll('#token-details-section .card-body');
        for (const container of chartContainers) {
            if (container.querySelector('#sentiment-chart')) {
                showLoading(container);
                break;
            }
        }

        const selectedRange = document.querySelector('input[name="timeRange"]:checked').dataset.range;

        const infoUrl = `${API_BASE_URL}/tokens/${coinName}/info?time_range=${selectedRange}`;
        const tweetsUrl = `${API_BASE_URL}/tokens/${coinName}/tweets`;
        const sentimentUrl = `${API_BASE_URL}/tokens/${coinName}/sentiment/hourly`;

        try {
            const [infoRes, tweetsRes, sentimentRes] = await Promise.all([
                fetch(infoUrl),
                fetch(tweetsUrl),
                fetch(sentimentUrl)
            ]);

            if (!infoRes.ok) {
                const errorMsg = infoRes.status === 404 ? 'Token not found or no mentions.' : 'Failed to fetch token info.';
                throw new Error(errorMsg);
            }

            const info = await infoRes.json();
            const tweets = tweetsRes.ok ? await tweetsRes.json() : [];
            const sentimentData = sentimentRes.ok ? await sentimentRes.json() : [];

            renderTokenInfo(info);
            renderLatestTweets(tweets);
            renderSentimentChart(sentimentData);

        } catch (error) {
            console.error('Error fetching token data:', error);
            tokenDetailsSection.classList.add('d-none');
            tokenPlaceholder.classList.remove('d-none');
            showError(tokenPlaceholder, `Could not load data for ${coinName}. ${error.message}`);
        }
    };

    const renderTokenInfo = (info) => {
        const score = info.average_sentiment_score.toFixed(3);
        let sentimentBadge;
        if (score > 0.05) sentimentBadge = `<span class="badge bg-success">Positive</span>`;
        else if (score < -0.05) sentimentBadge = `<span class="badge bg-danger">Negative</span>`;
        else sentimentBadge = `<span class="badge bg-secondary">Neutral</span>`;

        tokenInfoDetails.innerHTML = `
            <div class="row g-3">
                <div class="col-md-7">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">Total Mentions <span class="badge bg-primary rounded-pill">${info.total_mentions}</span></li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">Positive <span class="badge bg-success rounded-pill">${info.positive_mentions}</span></li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">Negative <span class="badge bg-danger rounded-pill">${info.negative_mentions}</span></li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">Neutral <span class="badge bg-secondary rounded-pill">${info.neutral_mentions}</span></li>
                    </ul>
                </div>
                <div class="col-md-5 d-flex flex-column justify-content-center align-items-center text-center">
                    <h6 class="text-body-secondary mb-1">Avg. Sentiment Score</h6>
                    <h2 class="display-5 fw-bold mb-2">${score}</h2>
                    ${sentimentBadge}
                </div>
            </div>
        `;

        const keywordsContainer = document.getElementById('top-keywords-container');
        const keywordsList = document.getElementById('top-keywords-list');
        if (info.top_keywords && info.top_keywords.length > 0) {
            keywordsList.innerHTML = info.top_keywords.map(kw => `<span class="badge bg-info text-dark me-1 mb-1">${kw.keyword} (${kw.count})</span>`).join('');
            keywordsContainer.classList.remove('d-none');
        } else {
            keywordsContainer.classList.add('d-none');
        }

        tokenDetailsSection.classList.remove('d-none');
        tokenPlaceholder.classList.add('d-none');

        // Hide all loading indicators within the details section
        const chartContainers = document.querySelectorAll('#token-details-section .card-body');
        for (const container of chartContainers) {
            hideLoading(container);
        }
    };

    const renderLatestTweets = (tweets) => {
        if (!tweets || tweets.length === 0) {
            latestTweetsList.innerHTML = '<p class="text-center text-body-secondary">No recent tweets found.</p>';
            return;
        }
        
        const getSentimentColor = (sentiment, weight) => {
            if (sentiment === 'positive') return '#28a745'; // green
            if (sentiment === 'negative') return '#dc3545'; // red
            return '#6c757d'; // gray for neutral
        };
        
        const getSentimentLabel = (sentiment) => {
            if (sentiment === 'positive') return 'Positive';
            if (sentiment === 'negative') return 'Negative';
            return 'Neutral';
        };
        
        latestTweetsList.innerHTML = `
            <div class="list-group list-group-flush">
                ${tweets.map(tweet => {
                    const sentimentColor = getSentimentColor(tweet.sentiment, tweet.weight);
                    const sentimentLabel = getSentimentLabel(tweet.sentiment);
                    const tweetText = tweet.text;
                    const isLongTweet = tweetText.length > 150;
                    const tweetId = `tweet-${Math.random().toString(36).substr(2, 9)}`;
                    
                    return `
                    <div class="list-group-item position-relative">
                        <div class="sentiment-indicator" style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background-color: ${sentimentColor};"></div>
                        <div style="padding-left: 8px;">
                            ${isLongTweet ? 
                                `<p class="mb-1">
                                    <span id="${tweetId}-short">${tweetText.substring(0, 150)}... </span>
                                    <span id="${tweetId}-full" style="display: none;">${tweetText}</span>
                                    <a href="#" class="text-primary toggle-tweet" data-tweet-id="${tweetId}" data-expanded="false">Show more</a>
                                </p>` : 
                                `<p class="mb-1">${tweetText}</p>`
                            }
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-body-secondary">
                                    - <a href="https://x.com/${tweet.author || 'user'}" target="_blank" class="text-decoration-none">@${tweet.author || 'user'}</a> 
                                    on ${new Date(tweet.publish_date).toLocaleString()} 
                                    <a href="https://x.com/${tweet.author || 'user'}/status/${tweet.twitter_id}" target="_blank" class="ms-1" title="View on X">
                                        <i class="bi bi-box-arrow-up-right"></i>
                                    </a>
                                </small>
                                <span class="badge" style="background-color: ${sentimentColor};">${sentimentLabel}</span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>`;
            
        // Add event listeners for tweet expansion
        document.querySelectorAll('.toggle-tweet').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const tweetId = toggle.dataset.tweetId;
                const isExpanded = toggle.dataset.expanded === 'true';
                
                document.getElementById(`${tweetId}-short`).style.display = isExpanded ? 'inline' : 'none';
                document.getElementById(`${tweetId}-full`).style.display = isExpanded ? 'none' : 'inline';
                
                toggle.textContent = isExpanded ? 'Show more' : 'Show less';
                toggle.dataset.expanded = isExpanded ? 'false' : 'true';
            });
        });
    };

    const renderSentimentChart = (data) => {
        // Find the card that should contain the sentiment chart
        const chartCards = document.querySelectorAll('#token-details-section .card');
        let chartContainer = null;
        
        for (const card of chartCards) {
            if (card.querySelector('.card-header')?.textContent.includes('Sentiment')) {
                chartContainer = card.querySelector('.card-body');
                break;
            }
        }
        
        if (!chartContainer) {
            console.error('Sentiment chart container not found');
            return;
        }
        
        if (sentimentChart) {
            sentimentChart.destroy();
        }

        if (!data || data.length === 0) {
            // Show a message but keep a hidden canvas element for future updates
            chartContainer.innerHTML = '<p class="text-center text-body-secondary py-5">No sentiment data available to display chart.</p>';
            chartContainer.innerHTML += '<canvas id="sentiment-chart" style="display:none;"></canvas>';
            return;
        }

        // Ensure canvas exists
        chartContainer.innerHTML = '<canvas id="sentiment-chart"></canvas>';
        
        // Get the newly created canvas element
        const newCanvas = document.getElementById('sentiment-chart');
        // Get the 2D context for the canvas
        const ctx = newCanvas.getContext('2d');
        
        // Prepare data for the chart
        const labels = data.map(d => new Date(d.hour).toLocaleTimeString('en-GB', { hour: '2-digit' }) + ':00');
        const sentimentScores = data.map(d => d.avg_sentiment);
        const mentionCounts = data.map(d => d.n_tweets);

        sentimentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Average Sentiment Score',
                        data: sentimentScores,
                        borderColor: 'rgba(255, 206, 86, 1)',
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        yAxisID: 'y-sentiment',
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        type: 'bar',
                        label: 'Number of Mentions',
                        data: mentionCounts,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        yAxisID: 'y-mentions',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        stacked: true,
                    },
                    'y-sentiment': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Avg. Sentiment Score'
                        }
                    },
                    'y-mentions': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Mentions'
                        },
                        grid: {
                            drawOnChartArea: false, // only draw grid for sentiment axis
                        },
                        ticks: {
                           beginAtZero: true
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    };

    // --- Event Listeners ---
    timeRangeSelector.addEventListener('change', fetchTopTokens);
    tokenSearchBtn.addEventListener('click', () => fetchAllTokenData(tokenSearchInput.value.trim().toUpperCase()));
    tokenSearchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            fetchAllTokenData(tokenSearchInput.value.trim().toUpperCase());
        }
    });

    // --- Initial Load ---
    fetchTopTokens();
});
