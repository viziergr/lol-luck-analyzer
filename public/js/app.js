// Automatically use the same origin as the page (works for localhost and VPS)
const API_URL = window.location.origin;

// État de l'application
const state = {
    players: [],
    currentAnalysis: null,
    matchHistory: [] // Stocker l'historique pour le modal
};

// Elements DOM
const searchForm = document.getElementById('searchForm');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const compareBtn = document.getElementById('compareBtn');
const playersList = document.getElementById('playersList');
const loadingState = document.getElementById('loadingState');
const loadingDetails = document.getElementById('loadingDetails');
const resultsSection = document.getElementById('resultsSection');
const comparisonSection = document.getElementById('comparisonSection');
const matchModal = document.getElementById('matchModal');
const matchDetails = document.getElementById('matchDetails');
const modalClose = document.querySelector('.modal-close');

// Event Listeners
searchForm.addEventListener('submit', handleAnalyze);
addPlayerBtn.addEventListener('click', handleAddPlayer);
compareBtn.addEventListener('click', handleCompare);

// Modal event listeners
modalClose.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === matchModal) {
        closeModal();
    }
});

// Analyser un joueur
async function handleAnalyze(e) {
    e.preventDefault();

    const gameName = document.getElementById('gameName').value.trim();
    const tagLine = document.getElementById('tagLine').value.trim();
    const matchCount = parseInt(document.getElementById('matchCount').value);

    if (!gameName || !tagLine) {
        alert('Veuillez entrer un Riot ID valide');
        return;
    }

    showLoading('Récupération des données du joueur...');
    hideResults();

    try {
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameName, tagLine, matchCount })
        });

        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        hideLoading();
        displayResults(data);

    } catch (error) {
        hideLoading();
        alert(`Erreur: ${error.message}`);
        console.error(error);
    }
}

// Ajouter un joueur à la liste de comparaison
function handleAddPlayer() {
    const gameName = document.getElementById('gameName').value.trim();
    const tagLine = document.getElementById('tagLine').value.trim();

    if (!gameName || !tagLine) {
        alert('Veuillez entrer un Riot ID valide');
        return;
    }

    const riotId = `${gameName}#${tagLine}`;

    if (state.players.some(p => p.gameName === gameName && p.tagLine === tagLine)) {
        alert('Ce joueur est déjà dans la liste');
        return;
    }

    state.players.push({ gameName, tagLine, riotId });
    updatePlayersList();

    // Clear inputs
    document.getElementById('gameName').value = '';
    document.getElementById('tagLine').value = '';
}

// Mettre à jour l'affichage de la liste des joueurs
function updatePlayersList() {
    if (state.players.length === 0) {
        playersList.innerHTML = '';
        compareBtn.style.display = 'none';
        return;
    }

    playersList.innerHTML = state.players.map((player, index) => `
        <div class="player-item">
            <span>${player.riotId}</span>
            <button onclick="removePlayer(${index})">Retirer</button>
        </div>
    `).join('');

    compareBtn.style.display = state.players.length >= 2 ? 'block' : 'none';
}

// Retirer un joueur de la liste
function removePlayer(index) {
    state.players.splice(index, 1);
    updatePlayersList();
}

// Comparer plusieurs joueurs
async function handleCompare() {
    if (state.players.length < 2) {
        alert('Ajoutez au moins 2 joueurs pour comparer');
        return;
    }

    const matchCount = parseInt(document.getElementById('matchCount').value);

    showLoading(`Analyse de ${state.players.length} joueurs...`);
    hideResults();

    try {
        const response = await fetch(`${API_URL}/api/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                players: state.players,
                matchCount
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        hideLoading();
        displayComparison(data);

    } catch (error) {
        hideLoading();
        alert(`Erreur: ${error.message}`);
        console.error(error);
    }
}

// Afficher les résultats d'un seul joueur
function displayResults(data) {
    const { summoner, analysis } = data;

    state.currentAnalysis = analysis;
    resultsSection.style.display = 'block';
    comparisonSection.style.display = 'none';

    // Déterminer le sentiment
    const luckScore = analysis.luckScore;
    let badge, label, description;

    if (luckScore > 20) {
        badge = 'lucky';
        label = '🍀 Chanceux !';
        description = 'Vous gagnez souvent même avec des performances moyennes !';
    } else if (luckScore < -20) {
        badge = 'unlucky';
        label = '😢 Malchanceux !';
        description = 'Vous jouez bien mais perdez souvent... Courage !';
    } else {
        badge = 'neutral';
        label = '⚖️ Équilibré';
        description = 'Vos victoires reflètent vos performances.';
    }

    // Main result card
    document.getElementById('mainResult').innerHTML = `
        <h2>${summoner.gameName}#${summoner.tagLine}</h2>
        <div class="luck-badge ${badge}">${luckScore > 0 ? '+' : ''}${luckScore}</div>
        <div class="luck-label">${label}</div>
        <p class="luck-description">${description}</p>
        <p style="margin-top: 1rem; color: var(--text-muted);">
            Basé sur ${analysis.totalGames} parties classées (Saison 2026)
        </p>
    `;

    // Stats
    document.getElementById('avgPerformance').textContent = analysis.avgPerformance;
    document.getElementById('winRate').textContent = analysis.winRate;
    document.getElementById('carriedWins').textContent = analysis.luckStats.carriedWins;
    document.getElementById('carriedLosses').textContent = analysis.luckStats.carriedLosses;

    // Match history
    displayMatchHistory(analysis.matchHistory);
}

// Afficher l'historique des matchs
function displayMatchHistory(matches) {
    const matchHistory = document.getElementById('matchHistory');

    // Stocker l'historique dans le state pour le modal
    state.matchHistory = matches;

    matchHistory.innerHTML = matches.slice(0, 15).map((match, index) => {
        const performancePercent = match.playerPerformance;
        const winClass = match.won ? 'win' : 'loss';
        const championIcon = match.championIcon || '';

        return `
            <div class="match-item ${winClass}" onclick="showMatchDetails(${index})">
                ${championIcon ? `<img src="${championIcon}" alt="${match.champion}" class="champion-icon-small" onerror="this.style.display='none'">` : ''}
                <div class="match-info">
                    <span class="champion-name">${match.champion}</span>
                    <span class="kda">${match.kda}</span>
                </div>
                <div class="performance-bar">
                    <div class="performance-fill" style="width: ${performancePercent}%"></div>
                </div>
                <span class="performance-score">${performancePercent}/100</span>
            </div>
        `;
    }).join('');
}

// Afficher la comparaison de plusieurs joueurs
function displayComparison(data) {
    const { results, leaderboard } = data;

    resultsSection.style.display = 'none';
    comparisonSection.style.display = 'block';

    // Leaderboard
    displayLeaderboard(leaderboard.all);

    // Players grid
    displayPlayersGrid(results);
}

// Afficher le classement
function displayLeaderboard(players) {
    const leaderboard = document.getElementById('leaderboard');

    leaderboard.innerHTML = players.map((player, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'first' : '';
        const luckScore = player.luckScore;

        let emoji = '⚖️';
        if (luckScore > 20) emoji = '🍀';
        else if (luckScore < -20) emoji = '😢';

        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${rank}</div>
                <div class="player-info">
                    <div class="player-name">${emoji} ${player.playerName}</div>
                    <div class="player-stats">
                        Chance: ${luckScore > 0 ? '+' : ''}${luckScore} | 
                        Performance: ${player.avgPerformance}/100 | 
                        Winrate: ${player.winRate}%
                    </div>
                </div>
                <div class="luck-badge ${luckScore > 20 ? 'lucky' : luckScore < -20 ? 'unlucky' : ''}" style="font-size: 2rem;">
                    ${luckScore > 0 ? '+' : ''}${luckScore}
                </div>
            </div>
        `;
    }).join('');
}

// Afficher la grille de comparaison
function displayPlayersGrid(results) {
    const grid = document.getElementById('playersGrid');

    grid.innerHTML = results.map(result => {
        if (result.error) {
            return `
                <div class="card glass">
                    <h3>${result.player.gameName}#${result.player.tagLine}</h3>
                    <p style="color: var(--danger);">❌ ${result.error}</p>
                </div>
            `;
        }

        const { summoner, analysis } = result;
        const luckScore = analysis.luckScore;

        return `
            <div class="card glass">
                <h3>${summoner.gameName}#${summoner.tagLine}</h3>
                <div class="luck-badge ${luckScore > 20 ? 'lucky' : luckScore < -20 ? 'unlucky' : ''}" style="font-size: 3rem; margin: 1rem 0;">
                    ${luckScore > 0 ? '+' : ''}${luckScore}
                </div>
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Performance</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${analysis.avgPerformance}/100</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Winrate</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${analysis.winRate}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Carried Wins</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${analysis.luckStats.carriedWins}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Unlucky Losses</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">${analysis.luckStats.carriedLosses}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Utilitaires
function showLoading(message = 'Chargement...') {
    loadingDetails.textContent = message;
    loadingState.style.display = 'block';
}

function hideLoading() {
    loadingState.style.display = 'none';
}

function hideResults() {
    resultsSection.style.display = 'none';
    comparisonSection.style.display = 'none';
}

// Modal functions
function showMatchDetails(matchIndex) {
    const match = state.matchHistory[matchIndex];
    if (!match || !match.allPlayers) {
        alert('Détails de la partie non disponibles');
        return;
    }

    // Séparer les équipes
    const blueTeam = match.allPlayers.filter(p => p.teamId === 100);
    const redTeam = match.allPlayers.filter(p => p.teamId === 200);

    const blueWon = blueTeam[0].win;
    const redWon = redTeam[0].win;

    // Générer le HTML du modal
    matchDetails.innerHTML = `
        <div class="match-header">
            <h3>${match.won ? '✓ Victoire' : '✗ Défaite'} - ${match.champion}</h3>
            <div class="match-info-bar">
                <span>⏱️ ${match.gameDuration || '?'} minutes</span>
                <span>🎮 ${match.gameMode || 'CLASSIC'}</span>
                <span>📊 KDA: ${match.kda}</span>
                <span>⭐ Score: ${match.playerPerformance}/100</span>
            </div>
        </div>

        <div class="teams-container">
            <!-- Team Bleue -->
            <div class="team blue ${blueWon ? 'win' : 'loss'}">
                <h4>🔵 Équipe Bleue</h4>
                ${blueTeam.map(player => renderPlayerRow(player, match)).join('')}
            </div>

            <!-- Team Rouge -->
            <div class="team red ${redWon ? 'win' : 'loss'}">
                <h4>🔴 Équipe Rouge</h4>
                ${redTeam.map(player => renderPlayerRow(player, match)).join('')}
            </div>
        </div>
    `;

    matchModal.style.display = 'block';
}

function renderPlayerRow(player, currentMatch) {
    // Déterminer si c'est le joueur analysé
    const isCurrentPlayer = player.champion === currentMatch.champion;

    // Classe de couleur selon la performance
    let perfClass = 'perf-medium';
    if (player.performance >= 80) perfClass = 'perf-excellent';
    else if (player.performance >= 60) perfClass = 'perf-good';
    else if (player.performance >= 40) perfClass = 'perf-medium';
    else if (player.performance >= 20) perfClass = 'perf-bad';
    else perfClass = 'perf-terrible';

    const kda = `${player.kills}/${player.deaths}/${player.assists}`;
    const kdaRatio = player.deaths > 0
        ? ((player.kills + player.assists) / player.deaths).toFixed(2)
        : (player.kills + player.assists).toFixed(2);

    const championIconUrl = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${player.champion}.png`;

    return `
        <div class="player-row ${isCurrentPlayer ? 'highlight' : ''}">
            <img src="${championIconUrl}" alt="${player.champion}" class="player-champion-icon" onerror="this.style.display='none'">
            <div class="player-champion">${player.champion}</div>
            <div class="player-name">
                ${player.summonerName}${player.tagLine ? '#' + player.tagLine : ''}
                ${isCurrentPlayer ? '<span class="you-badge">(Vous)</span>' : ''}
            </div>
            <div class="player-stats">
                <span title="KDA">${kda}</span>
                <span title="KDA Ratio">${kdaRatio} KDA</span>
                <span title="CS">${player.cs} CS</span>
                <span title="Dégâts">${Math.floor(player.damage / 1000)}k dmg</span>
            </div>
            <div class="player-performance ${perfClass}">
                ${player.performance}/100
            </div>
        </div>
    `;
}

function closeModal() {
    matchModal.style.display = 'none';
}

// Rendre showMatchDetails accessible globalement
window.showMatchDetails = showMatchDetails;
