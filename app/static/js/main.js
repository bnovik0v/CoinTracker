document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: DOM fully loaded and parsed - script starting execution');

    try {
        // --- DOM Elements ---
        console.log('DEBUG: Starting to get DOM elements');
        const timeRangeSelector = document.getElementById('time-range-selector');
        console.log('DEBUG: timeRangeSelector:', timeRangeSelector);
        const tokenSearchInput = document.getElementById('token-search-input');
        console.log('DEBUG: tokenSearchInput:', tokenSearchInput);
        const tokenSearchBtn = document.getElementById('token-search-btn');
        console.log('DEBUG: tokenSearchBtn:', tokenSearchBtn);
        const topTokensList = document.getElementById('top-tokens-list');
        console.log('DEBUG: topTokensList:', topTokensList);
        const tokenInfoDetails = document.getElementById('token-info-details');
        console.log('DEBUG: tokenInfoDetails:', tokenInfoDetails);
        const latestTweetsList = document.getElementById('latest-tweets-list');
        console.log('DEBUG: latestTweetsList:', latestTweetsList);
        const tokenDetailsSection = document.getElementById('token-details-section');
        console.log('DEBUG: tokenDetailsSection:', tokenDetailsSection);
        const tokenPlaceholder = document.getElementById('token-placeholder');
        console.log('DEBUG: tokenPlaceholder:', tokenPlaceholder);

        // --- State ---
        let sentimentChart = null;
        const API_BASE_URL = '/api';
        console.log('DEBUG: API_BASE_URL set to:', API_BASE_URL);

    // --- Utility Functions ---
    const showLoading = (element) => {
        // Look for a spinner container within the element
        const spinnerContainer = element.querySelector('.chart-spinner, .tweets-spinner');
        
        // If there's a dedicated spinner container, only affect that
        if (spinnerContainer) {
            spinnerContainer.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-5" style="opacity: 0; transition: opacity 0.3s ease;">
                    <div class="position-relative">
                        <div class="spinner-border" style="width: 3rem; height: 3rem; color: #6366f1;" role="status"></div>
                        <div class="spinner-grow" style="width: 1rem; height: 1rem; color: #8b5cf6; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" role="status"></div>
                    </div>
                </div>`;
                
            // Trigger animation after a small delay
            setTimeout(() => {
                const loadingDiv = spinnerContainer.querySelector('.d-flex.justify-content-center');
                if (loadingDiv) loadingDiv.style.opacity = '1';
            }, 10);
        } else {
            // Fallback to old behavior for elements without dedicated spinner container
            // Save the original content to restore later if needed
            if (!element.dataset.originalContent && element.innerHTML.trim() !== '') {
                element.dataset.originalContent = element.innerHTML;
            }
            
            element.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-5" style="opacity: 0; transition: opacity 0.3s ease;">
                    <div class="position-relative">
                        <div class="spinner-border" style="width: 3rem; height: 3rem; color: #6366f1;" role="status"></div>
                        <div class="spinner-grow" style="width: 1rem; height: 1rem; color: #8b5cf6; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" role="status"></div>
                    </div>
                </div>`;
            
            // Trigger animation after a small delay
            setTimeout(() => {
                const loadingDiv = element.querySelector('.d-flex.justify-content-center');
                if (loadingDiv) loadingDiv.style.opacity = '1';
            }, 10);
        }
        
        // Update the last update time
        updateLastUpdateTime();
    };

    const showError = (element, message) => {
        // Check for content container (tweets-content) or use the element itself
        const contentContainer = element.querySelector('.tweets-content') || element;
        
        contentContainer.innerHTML = `
            <div class="alert alert-danger m-0 shadow-sm" role="alert" style="opacity: 0; transform: translateY(10px); transition: all 0.3s ease;">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2" style="font-size: 1.5rem;"></i>
                    <div>
                        <h6 class="alert-heading mb-1">Error</h6>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            </div>`;
        
        // Trigger animation after a small delay
        setTimeout(() => {
            const alert = contentContainer.querySelector('.alert');
            if (alert) {
                alert.style.opacity = '1';
                alert.style.transform = 'translateY(0)';
            }
        }, 10);
    };

    const hideLoading = (element) => {
        // Look for a spinner container within the element
        const spinnerContainer = element.querySelector('.chart-spinner, .tweets-spinner');
        
        if (spinnerContainer) {
            // If there's a dedicated spinner container, just clear the spinner
            const loadingDiv = spinnerContainer.querySelector('.d-flex.justify-content-center');
            if (loadingDiv) {
                loadingDiv.style.opacity = '0';
                setTimeout(() => {
                    spinnerContainer.innerHTML = '';
                }, 300); // Match the transition duration
            }
        } else {
            // Fallback to old behavior
            const loadingDiv = element.querySelector('.d-flex.justify-content-center.align-items-center.py-5');
            
            if (loadingDiv) {
                loadingDiv.style.opacity = '0';
                setTimeout(() => {
                    if (element.dataset.originalContent) {
                        element.innerHTML = element.dataset.originalContent;
                        delete element.dataset.originalContent;
                    } else {
                        loadingDiv.remove();
                    }
                }, 300); // Match the transition duration
            }
        }
    };
    
    const updateLastUpdateTime = () => {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        }
    };

    // --- Gauge Chart Rendering ---
    const renderSentimentGauge = (score) => {
        // Convert score to a 0-100 scale for the gauge
        // Sentiment scores typically range from -1 to 1
        const normalizedScore = ((parseFloat(score) + 1) / 2) * 100;
        
        // Define colors based on sentiment ranges with modern color palette
        const getGaugeColor = (value) => {
            if (value < 40) return ['#ef4444', '#f87171']; // Negative - red gradient
            if (value > 60) return ['#10b981', '#34d399']; // Positive - green gradient
            return ['#6b7280', '#9ca3af']; // Neutral - gray gradient
        };
        
        const getSentimentLabel = (value) => {
            if (value < 40) return 'Bearish';
            if (value > 60) return 'Bullish';
            return 'Neutral';
        };
        
        const gaugeColors = getGaugeColor(normalizedScore);
        const sentimentLabel = getSentimentLabel(normalizedScore);
        
        const options = {
            series: [normalizedScore],
            chart: {
                height: 220,
                type: 'radialBar',
                offsetY: -10,
                sparkline: {
                    enabled: true
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                },
                background: 'transparent'
            },
            plotOptions: {
                radialBar: {
                    startAngle: -135,
                    endAngle: 135,
                    track: {
                        background: 'rgba(255, 255, 255, 0.1)',
                        strokeWidth: '97%',
                        margin: 5,
                        dropShadow: {
                            enabled: true,
                            top: 2,
                            left: 0,
                            blur: 4,
                            opacity: 0.15
                        }
                    },
                    dataLabels: {
                        name: {
                            show: true,
                            fontSize: '14px',
                            color: '#94a3b8',
                            offsetY: -10,
                            formatter: function() {
                                return sentimentLabel;
                            }
                        },
                        value: {
                            offsetY: 5,
                            fontSize: '22px',
                            fontWeight: 600,
                            formatter: function(val) {
                                // Convert back to original sentiment score range (-1 to 1)
                                const originalScore = (((val / 100) * 2) - 1).toFixed(3);
                                return originalScore;
                            },
                            color: '#f8fafc'
                        }
                    },
                    hollow: {
                        margin: 15,
                        size: '50%'
                    }
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    type: 'horizontal',
                    shadeIntensity: 0.5,
                    gradientToColors: [gaugeColors[1]],
                    inverseColors: false,
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 100]
                }
            },
            stroke: {
                lineCap: 'round',
                dashArray: 4
            },
            labels: [sentimentLabel],
            colors: [gaugeColors[0]],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        height: 180
                    }
                }
            }]
        };
        
        // Add a subtle fade-out effect before destroying the previous chart
        const chartElement = document.querySelector('#sentiment-gauge-chart');
        if (chartElement && sentimentGaugeChart) {
            chartElement.style.opacity = '0';
            setTimeout(() => {
                // Destroy previous chart if it exists
                sentimentGaugeChart.destroy();
                
                // Create new chart
                chartElement.style.opacity = '1';
                sentimentGaugeChart = new ApexCharts(chartElement, options);
                sentimentGaugeChart.render();
            }, 300);
        } else {
            // First time rendering, no need for transition
            if (sentimentGaugeChart) {
                sentimentGaugeChart.destroy();
            }
            // Check if the chart element exists before creating the chart
            const sentimentGaugeElement = document.querySelector('#sentiment-gauge-chart');
            if (sentimentGaugeElement) {
                sentimentGaugeChart = new ApexCharts(sentimentGaugeElement, options);
                sentimentGaugeChart.render();
            } else {
                console.error('ERROR: #sentiment-gauge-chart element not found');
            }
        }
    };
    
    // --- Data Fetching & Rendering ---
    const fetchTopTokens = async () => {
        console.log('DEBUG: fetchTopTokens function called');
        try {
        showLoading(topTokensList);
        try {
            // Add a fallback for the selected range
            const checkedInput = document.querySelector('input[name="timeRange"]:checked');
            const selectedRange = checkedInput ? checkedInput.dataset.range : 'hour';
            
            console.log('DEBUG: Fetching top tokens with time range:', selectedRange);
            console.log(`DEBUG: About to fetch from URL: ${API_BASE_URL}/tokens/top?time_range=${selectedRange}&limit=30`);
            const response = await fetch(`${API_BASE_URL}/tokens/top?time_range=${selectedRange}&limit=30`);
            console.log('DEBUG: Fetch response received:', response.status, response.statusText);
            
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            const tokens = await response.json();
            renderTopTokens(tokens);
        } catch (error) {
            console.error('ERROR: Error fetching top tokens:', error);
            if (topTokensList) {
                showError(topTokensList, 'Could not load top tokens.');
            } else {
                console.error('ERROR: topTokensList element not available for showing error');
            }
        }
    } catch (outerError) {
        console.error('ERROR: Outer error in fetchTopTokens:', outerError);
    }
    };

    const renderTopTokens = (tokens) => {
        if (!tokens || tokens.length === 0) {
            topTokensList.innerHTML = `
                <div class="text-center text-body-secondary p-4">
                    <i class="bi bi-database-x" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mt-3 mb-0">No tokens found in this time range.</p>
                </div>`;
            return;
        }

        const getBadgeClass = (score) => {
            if (score > 0) return 'bg-success';
            if (score < 0) return 'bg-danger';
            return 'bg-secondary';
        };
        
        // Sort tokens by absolute score value for visual impact
        const sortedTokens = [...tokens].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
        
        // Calculate the maximum absolute score for relative scaling
        const maxAbsScore = Math.max(...sortedTokens.map(token => Math.abs(token.score)));
        
        // Create a delay for staggered animation
        const getAnimationDelay = (index) => `${index * 50}ms`;
        
        // Generate the HTML with staggered animations
        topTokensList.innerHTML = `
            <div class="list-group list-group-flush">
                ${sortedTokens.map((token, index) => {
                    // Calculate relative score for visual indicator (width)
                    const relativeScore = Math.abs(token.score) / maxAbsScore;
                    const indicatorWidth = Math.max(5, Math.round(relativeScore * 100));
                    const scoreColor = token.score > 0 ? 'var(--positive-color)' : token.score < 0 ? 'var(--negative-color)' : 'var(--neutral-color)';
                    
                    return `
                    <a href="#" 
                       class="list-group-item list-group-item-action d-flex justify-content-between align-items-center position-relative overflow-hidden" 
                       data-coin-name="${token.coin_name}"
                       style="animation: fadeIn 0.3s ease-out forwards; animation-delay: ${getAnimationDelay(index)}; opacity: 0;">
                        <div class="position-absolute top-0 bottom-0 ${token.score >= 0 ? 'start-0' : 'end-0'}" 
                             style="width: ${indicatorWidth}%; background-color: ${scoreColor}; opacity: 0.1; z-index: 0;"></div>
                        <div class="d-flex align-items-center position-relative z-index-1">
                            <span class="fw-bold">${token.coin_name}</span>
                            ${token.rank ? `<span class="badge bg-primary ms-2 rounded-pill" style="font-size: 0.65rem;">#${token.rank}</span>` : ''}
                        </div>
                        <span class="badge ${getBadgeClass(token.score)} rounded-pill">${token.score > 0 ? '+' : ''}${token.score.toFixed(2)}</span>
                    </a>
                    `;
                }).join('')}
            </div>`;

        // Add click event listeners with active state handling
        document.querySelectorAll('#top-tokens-list a').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all items
                document.querySelectorAll('#top-tokens-list a').forEach(el => {
                    el.classList.remove('active');
                });
                
                // Add active class to clicked item
                e.currentTarget.classList.add('active');
                
                const coinName = e.currentTarget.dataset.coinName;
                tokenSearchInput.value = coinName;
                fetchAllTokenData(coinName);
            });
        });
    };

    const fetchAllTokenData = async (coinName) => {
        console.log('DEBUG: fetchAllTokenData function called with:', coinName);
        try {
            if (!coinName) return;

        tokenPlaceholder.classList.add('d-none');
        tokenDetailsSection.classList.remove('d-none');
        
        console.log('Fetching data for token:', coinName);
        
        // Show loading indicators in all relevant sections
        const chartContainers = document.querySelectorAll('#token-details-section .card-body');
        for (const container of chartContainers) {
            showLoading(container);
        }
        
        // Specifically ensure the tweets list container is shown and has a loading spinner
        showLoading(latestTweetsList);
        latestTweetsList.classList.remove('d-none');
        
        // Show the token details section and hide the placeholder
        tokenDetailsSection.classList.remove('d-none');
        tokenPlaceholder.classList.add('d-none');
        
        // Update the token name in all relevant places
        const tokenNameElements = document.querySelectorAll('.token-name');
        for (const element of tokenNameElements) {
            element.textContent = coinName;
        }
        
        try {
            // Construct the API URLs
            const infoUrl = `${API_BASE_URL}/tokens/${coinName}/info`;
            const tweetsUrl = `${API_BASE_URL}/tokens/${coinName}/tweets`;
            const sentimentUrl = `${API_BASE_URL}/tokens/${coinName}/sentiment/hourly`;
            
            console.log('Fetching from URLs:', { infoUrl, tweetsUrl, sentimentUrl });
            
            // Fetch all data in parallel
            const [infoRes, tweetsRes, sentimentRes] = await Promise.all([
                fetch(infoUrl),
                fetch(tweetsUrl),
                fetch(sentimentUrl)
            ]);
            
            console.log('API responses received:', {
                info: { status: infoRes.status, ok: infoRes.ok },
                tweets: { status: tweetsRes.status, ok: tweetsRes.ok },
                sentiment: { status: sentimentRes.status, ok: sentimentRes.ok }
            });
            
            if (!infoRes.ok || !tweetsRes.ok || !sentimentRes.ok) {
                const errorMsg = infoRes.status === 404 ? 'Token not found or no mentions.' : 'Failed to fetch token info.';
                throw new Error(errorMsg);
            }
            
            const [info, tweets, sentiment] = await Promise.all([
                infoRes.json(),
                tweetsRes.json(),
                sentimentRes.json()
            ]);
            
            console.log('Data received:', { 
                info: 'Token info received', 
                tweets: `${tweets.length} tweets received`,
                sentiment: `${sentiment.length} sentiment data points received`
            });
            
            // Render all components with the fetched data
            renderTokenInfo(info);
            renderLatestTweets(tweets);
            renderSentimentChart(sentiment);
        } catch (error) {
            console.error('Error fetching token data:', error);
            
            // Show error messages in all sections
            for (const container of chartContainers) {
                showError(container, error.message || 'Failed to load data.');
            }
        }
    } catch (outerError) {
        console.error('ERROR: Outer error in fetchAllTokenData:', outerError);
    }
    };

    // Global variable to store the sentiment gauge chart
    let sentimentGaugeChart = null;
    
    const renderTokenInfo = (info) => {
        const score = info.average_sentiment_score.toFixed(3);
        
        // Determine sentiment category and labels
        let sentimentCategory, sentimentIcon;
        if (score > 0.05) {
            sentimentCategory = 'positive';
            sentimentIcon = '<i class="bi bi-emoji-smile-fill me-1"></i>';
        } else if (score < -0.05) {
            sentimentCategory = 'negative';
            sentimentIcon = '<i class="bi bi-emoji-frown-fill me-1"></i>';
        } else {
            sentimentCategory = 'neutral';
            sentimentIcon = '<i class="bi bi-emoji-neutral-fill me-1"></i>';
        }
        
        // Calculate percentages for the donut chart
        const totalMentions = info.total_mentions;
        const positivePercent = Math.round((info.positive_mentions / totalMentions) * 100) || 0;
        const negativePercent = Math.round((info.negative_mentions / totalMentions) * 100) || 0;
        const neutralPercent = Math.round((info.neutral_mentions / totalMentions) * 100) || 0;
        
        // Create a fade-in animation
        tokenInfoDetails.style.opacity = '0';
        
        // Modern layout with cards and better visual hierarchy
        tokenInfoDetails.innerHTML = `
            <div class="row g-3">
                <div class="col-md-7">
                    <div class="sentiment-distribution mb-3">
                        <h6 class="fw-semibold mb-3">Sentiment Distribution</h6>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center">
                                <div class="sentiment-indicator me-2" style="width: 12px; height: 12px; border-radius: 50%; background-color: var(--positive-color);"></div>
                                <span>Positive</span>
                            </div>
                            <div>
                                <span class="fw-semibold">${info.positive_mentions}</span>
                                <span class="text-body-secondary small">(${positivePercent}%)</span>
                            </div>
                        </div>
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar" role="progressbar" style="width: ${positivePercent}%; background-color: var(--positive-color);" 
                                 aria-valuenow="${positivePercent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center">
                                <div class="sentiment-indicator me-2" style="width: 12px; height: 12px; border-radius: 50%; background-color: var(--negative-color);"></div>
                                <span>Negative</span>
                            </div>
                            <div>
                                <span class="fw-semibold">${info.negative_mentions}</span>
                                <span class="text-body-secondary small">(${negativePercent}%)</span>
                            </div>
                        </div>
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar" role="progressbar" style="width: ${negativePercent}%; background-color: var(--negative-color);" 
                                 aria-valuenow="${negativePercent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center">
                                <div class="sentiment-indicator me-2" style="width: 12px; height: 12px; border-radius: 50%; background-color: var(--neutral-color);"></div>
                                <span>Neutral</span>
                            </div>
                            <div>
                                <span class="fw-semibold">${info.neutral_mentions}</span>
                                <span class="text-body-secondary small">(${neutralPercent}%)</span>
                            </div>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar" role="progressbar" style="width: ${neutralPercent}%; background-color: var(--neutral-color);" 
                                 aria-valuenow="${neutralPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                    
                    <div class="token-stats">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-semibold mb-0">Total Mentions</h6>
                            <div class="badge bg-primary rounded-pill fs-6">${info.total_mentions}</div>
                        </div>
                        
                        <div class="token-stats-card p-3 mb-3 rounded" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2);">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="text-body-secondary small">Sentiment Score</div>
                                    <div class="fs-4 fw-semibold">${score}</div>
                                </div>
                                <div>
                                    <span class="badge ${sentimentCategory === 'positive' ? 'bg-success' : sentimentCategory === 'negative' ? 'bg-danger' : 'bg-secondary'} fs-6">
                                        ${sentimentIcon} ${sentimentCategory.charAt(0).toUpperCase() + sentimentCategory.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-5 d-flex flex-column justify-content-center align-items-center text-center">
                    <h6 class="fw-semibold mb-2">Sentiment Gauge</h6>
                    <div id="sentiment-gauge-chart" style="width: 100%;"></div>
                </div>
            </div>
        `;
        
        // Fade in the content
        setTimeout(() => {
            tokenInfoDetails.style.opacity = '1';
            tokenInfoDetails.style.transition = 'opacity 0.5s ease';
        }, 50);
        
        // Render the gauge chart after the DOM is updated
        setTimeout(() => renderSentimentGauge(score), 100);

        // Handle keywords with better styling and animations
        const keywordsContainer = document.getElementById('top-keywords-container');
        const keywordsList = document.getElementById('top-keywords-list');
        
        if (keywordsList && info.top_keywords && info.top_keywords.length > 0) {
            // Sort keywords by count for better visualization
            const sortedKeywords = [...info.top_keywords].sort((a, b) => b.count - a.count);
            
            // Calculate the maximum count for relative sizing
            const maxCount = Math.max(...sortedKeywords.map(kw => kw.count));
            
            // Generate HTML with staggered animations and size variations
            keywordsList.innerHTML = sortedKeywords.map((kw, index) => {
                // Calculate relative size based on count
                const sizePercent = Math.max(80, Math.min(120, (kw.count / maxCount) * 120));
                const fontSize = `${sizePercent}%`;
                const delay = `${index * 50}ms`;
                
                return `<span class="badge me-2 mb-2" 
                             style="background: linear-gradient(135deg, #3b82f6, #2dd4bf); 
                                    font-size: ${fontSize}; 
                                    animation: fadeIn 0.5s ease forwards; 
                                    animation-delay: ${delay}; 
                                    opacity: 0;">
                        ${kw.keyword} <span class="badge bg-white text-dark ms-1">${kw.count}</span>
                      </span>`;
            }).join('');
            
            keywordsContainer.classList.remove('d-none');
        } else if (keywordsContainer) {
            keywordsContainer.classList.add('d-none');
        }

        // Show the token details section with animation
        tokenDetailsSection.classList.remove('d-none');
        tokenPlaceholder.classList.add('d-none');

        // Hide all loading indicators within the details section
        const chartContainers = document.querySelectorAll('#token-details-section .card-body');
        for (const container of chartContainers) {
            hideLoading(container);
        }
    };

    const renderLatestTweets = (tweets) => {
        // Find the tweets content container
        const tweetsContent = latestTweetsList.querySelector('.tweets-content');
        
        if (!tweets || tweets.length === 0) {
            tweetsContent.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-chat-square-text" style="font-size: 2.5rem; opacity: 0.3;"></i>
                    <p class="mt-3 text-body-secondary">No recent mentions found.</p>
                </div>`;
            hideLoading(latestTweetsList);
            return;
        }
        
        const getSentimentColor = (sentiment) => {
            if (sentiment === 'positive') return 'var(--positive-color)'; 
            if (sentiment === 'negative') return 'var(--negative-color)';
            return 'var(--neutral-color)';
        };
        
        const getSentimentIcon = (sentiment) => {
            if (sentiment === 'positive') return '<i class="bi bi-emoji-smile-fill"></i>';
            if (sentiment === 'negative') return '<i class="bi bi-emoji-frown-fill"></i>';
            return '<i class="bi bi-emoji-neutral-fill"></i>';
        };
        
        const getSentimentLabel = (sentiment) => {
            if (sentiment === 'positive') return 'Positive';
            if (sentiment === 'negative') return 'Negative';
            return 'Neutral';
        };
        
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return date.toLocaleDateString();
        };
        
        // Highlight keywords in tweet text
        const highlightKeywords = (text, coinName) => {
            // Basic highlighting for the token name
            const regex = new RegExp(`(${coinName})`, 'gi');
            return text.replace(regex, '<span class="highlight-keyword">$1</span>');
        };
        
        // Create a delay for staggered animation
        const getAnimationDelay = (index) => `${index * 80}ms`;
        tweetsContent.innerHTML = `
            <div class="list-group list-group-flush">
                ${tweets.map((tweet, index) => {
                    const sentimentColor = getSentimentColor(tweet.sentiment);
                    const sentimentIcon = getSentimentIcon(tweet.sentiment);
                    const sentimentLabel = getSentimentLabel(tweet.sentiment);
                    const tweetText = tweet.text;
                    const isLongTweet = tweetText.length > 180;
                    const tweetId = `tweet-${Math.random().toString(36).substr(2, 9)}`;
                    const formattedDate = formatDate(tweet.publish_date);
                    // Make sure tokenSearchInput exists and has a value before using it
                    const searchTerm = tokenSearchInput && tokenSearchInput.value ? tokenSearchInput.value.trim().toUpperCase() : '';
                    const highlightedText = highlightKeywords(tweetText, searchTerm);
                    
                    return `
                    <div class="list-group-item position-relative tweet-card" 
                         style="animation: fadeIn 0.4s ease-out forwards; animation-delay: ${getAnimationDelay(index)}; opacity: 0;">
                        <div class="sentiment-indicator" style="background-color: ${sentimentColor};"></div>
                        <div class="p-1">
                            <div class="d-flex align-items-center mb-2">
                                <div class="tweet-avatar rounded-circle bg-dark d-flex align-items-center justify-content-center me-2" 
                                     style="width: 40px; height: 40px; overflow: hidden;">
                                    <span class="text-light fw-bold">${(tweet.author || 'user').charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <div class="fw-semibold">@${tweet.author || 'user'}</div>
                                    <div class="text-body-secondary small">${formattedDate}</div>
                                </div>
                                <a href="https://x.com/${tweet.author || 'user'}/status/${tweet.twitter_id}" 
                                   target="_blank" 
                                   class="ms-auto btn btn-sm btn-outline-secondary rounded-pill" 
                                   title="View on X">
                                    <i class="bi bi-twitter-x"></i>
                                </a>
                            </div>
                            
                            <div class="tweet-content mb-2">
                                ${isLongTweet ? 
                                    `<div>
                                        <div id="${tweetId}-short">${highlightedText.substring(0, 180)}... 
                                            <button class="btn btn-sm btn-link p-0 toggle-tweet" data-tweet-id="${tweetId}" data-expanded="false">Show more</button>
                                        </div>
                                        <div id="${tweetId}-full" style="display: none;">${highlightedText}
                                            <button class="btn btn-sm btn-link p-0 toggle-tweet" data-tweet-id="${tweetId}" data-expanded="true">Show less</button>
                                        </div>
                                    </div>` : 
                                    `<div>${highlightedText}</div>`
                                }
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="badge rounded-pill" 
                                     style="background-color: ${sentimentColor}; padding: 0.35em 0.65em;">
                                    ${sentimentIcon} ${sentimentLabel}
                                </div>
                                ${tweet.weight ? 
                                    `<div class="small text-body-secondary">Weight: ${parseFloat(tweet.weight).toFixed(2)}</div>` : 
                                    ''
                                }
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            
            <style>
                .tweet-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    border-left: none;
                    margin-bottom: 0.5rem;
                }
                .tweet-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    z-index: 1;
                }
                .highlight-keyword {
                    font-weight: 600;
                    color: #6366f1;
                    background-color: rgba(99, 102, 241, 0.1);
                    padding: 0.1em 0.2em;
                    border-radius: 3px;
                }
                .toggle-tweet {
                    color: #6366f1;
                    text-decoration: none;
                    font-weight: 500;
                    padding: 0;
                    background: none;
                    border: none;
                }
                .toggle-tweet:hover {
                    text-decoration: underline;
                }
            </style>`;
            
        // Hide loading spinner after content is rendered
        hideLoading(latestTweetsList);
            
        // Add event listeners for tweet expansion with smooth transitions
        document.querySelectorAll('.toggle-tweet').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const tweetId = toggle.dataset.tweetId;
                const isExpanded = toggle.dataset.expanded === 'true';
                const shortElement = document.getElementById(`${tweetId}-short`);
                const fullElement = document.getElementById(`${tweetId}-full`);
                
                if (isExpanded) {
                    // Collapse: Show short version, hide full version
                    fullElement.style.opacity = '0';
                    setTimeout(() => {
                        fullElement.style.display = 'none';
                        shortElement.style.display = 'block';
                        setTimeout(() => {
                            shortElement.style.opacity = '1';
                        }, 10);
                    }, 200);
                } else {
                    // Expand: Hide short version, show full version
                    shortElement.style.opacity = '0';
                    setTimeout(() => {
                        shortElement.style.display = 'none';
                        fullElement.style.display = 'block';
                        setTimeout(() => {
                            fullElement.style.opacity = '1';
                        }, 10);
                    }, 200);
                }
                
                toggle.dataset.expanded = isExpanded ? 'false' : 'true';
            });
        });
    };

    const renderSentimentChart = (data) => {
        // Use the explicit ID instead of searching by header text
        const chartContainer = document.getElementById('sentiment-time-series');
        
        if (!chartContainer) {
            console.error('Sentiment chart container not found (#sentiment-time-series)');
            return;
        }
        
        // Add a fade-out effect before destroying the previous chart
        if (sentimentChart) {
            chartContainer.style.opacity = '0';
            setTimeout(() => {
                sentimentChart.destroy();
                updateChartContent();
            }, 300);
        } else {
            updateChartContent();
        }
        
        function updateChartContent() {
            const chartSpinner = chartContainer.querySelector('.chart-spinner');
            const canvas = document.getElementById('sentiment-chart');
            
            if (!data || data.length === 0) {
                // Show a message in the spinner area but keep the canvas
                if (chartSpinner) {
                    chartSpinner.innerHTML = `
                        <div class="text-center py-5 fade-in">
                            <i class="bi bi-graph-down" style="font-size: 3rem; opacity: 0.3;"></i>
                            <p class="mt-3 text-body-secondary">No sentiment data available to display chart.</p>
                        </div>`;
                }
                
                if (canvas) {
                    canvas.style.display = 'none';
                }
                
                chartContainer.style.opacity = '1';
                return;
            }

            // Make sure the canvas is visible
            if (canvas) {
                canvas.style.display = 'block';
            }
            
            chartContainer.style.opacity = '1';
            
            // Clear any error messages in the spinner area
            if (chartSpinner) {
                chartSpinner.innerHTML = '';
            }
            
            // Get the existing canvas element
            const ctx = canvas.getContext('2d');
            
            // Prepare data for the chart with better formatting
            const labels = data.map(d => {
                const date = new Date(d.hour);
                return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            });
            
            const sentimentScores = data.map(d => d.avg_sentiment);
            const mentionCounts = data.map(d => d.n_tweets);
            
            // Calculate moving average for sentiment trend line
            const movingAvgWindow = 3; // Window size for moving average
            const movingAvgSentiment = [];
            
            for (let i = 0; i < sentimentScores.length; i++) {
                if (i < movingAvgWindow - 1) {
                    // Not enough data points yet for moving average
                    movingAvgSentiment.push(null);
                } else {
                    // Calculate average of last N points
                    let sum = 0;
                    for (let j = 0; j < movingAvgWindow; j++) {
                        sum += sentimentScores[i - j];
                    }
                    movingAvgSentiment.push(sum / movingAvgWindow);
                }
            }
            
            // Create gradient for bar chart
            const getBarColor = (ctx) => {
                const value = ctx.raw;
                if (value > 0) {
                    // Positive sentiment - green
                    return value > 0.3 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.5)';
                } else if (value < 0) {
                    // Negative sentiment - red
                    return value < -0.3 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.5)';
                } else {
                    // Neutral sentiment - gray
                    return 'rgba(107, 114, 128, 0.5)';
                }
            };

            // If chart already exists, destroy it before creating a new one
            if (sentimentChart) {
                sentimentChart.destroy();
            }
            
            sentimentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'line',
                            label: 'Trend (Moving Avg)',
                            data: movingAvgSentiment,
                            borderColor: 'rgba(99, 102, 241, 1)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            tension: 0.4,
                            fill: false,
                            order: 0,
                        },
                        {
                            type: 'line',
                            label: 'Sentiment Score',
                            data: sentimentScores,
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            borderWidth: 1.5,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
        };};

        // --- Event Listeners ---
        console.log('DEBUG: Setting up event listeners');
        if (timeRangeSelector) {
            timeRangeSelector.addEventListener('change', fetchTopTokens);
            console.log('DEBUG: Added event listener to timeRangeSelector');
        } else {
            console.error('ERROR: timeRangeSelector element not found');
        }
        
        if (tokenSearchBtn) {
            tokenSearchBtn.addEventListener('click', () => fetchAllTokenData(tokenSearchInput?.value.trim().toUpperCase() || ''));
            console.log('DEBUG: Added event listener to tokenSearchBtn');
        } else {
            console.error('ERROR: tokenSearchBtn element not found');
        }
        
        if (tokenSearchInput) {
            tokenSearchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    fetchAllTokenData(tokenSearchInput.value.trim().toUpperCase());
                }
            });
            console.log('DEBUG: Added event listener to tokenSearchInput');
        } else {
            console.error('ERROR: tokenSearchInput element not found');
        }

        // --- Initial Load ---
        console.log('DEBUG: About to call initial fetchTopTokens()');
        try {
            fetchTopTokens();
            console.log('DEBUG: Initial fetchTopTokens() call completed');
        } catch (error) {
            console.error('ERROR: Failed to execute fetchTopTokens()', error);
        }
    
} catch (error) {
    console.error('ERROR: Script initialization failed:', error);
}});
