// 1. Initialize AWS SDK
AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:4b45cc3d-c755-482d-9058-059ca971579b'
});

const ddbClient = new AWS.DynamoDB.DocumentClient();

// 2. Global Data Stores (to avoid re-fetching)
let globalRosters = {};
let globalMatchScores = [];
let globalStatsData = null; 

// 3. DOM Elements
const homeBtn = document.getElementById('home-btn');
const matchesBtn = document.getElementById('matches-btn');
const statsBtn = document.getElementById('stats-btn');
const rulesBtn = document.getElementById('rules-btn');

const teamsContainer = document.getElementById('teams-container');
const matchesContainer = document.getElementById('matches-container');
const statsContainer = document.getElementById('stats-container');
const rulesContainer = document.getElementById('rules-container');

const matchSelect = document.getElementById('match-id-select');
const matchDetailsArea = document.getElementById('match-details-area');
const statsArea = document.getElementById('stats-area');

// 4. Load Data once
async function loadDashboardData() {
    teamsContainer.innerHTML = "<p style='text-align:center;'>Fetching IPL Standings...</p>";

    try {
        const [rosterData, scoreData] = await Promise.all([
            ddbClient.scan({ 
                TableName: 'owners_2026',
                ProjectionExpression: "#o, player, ipl_team",
                ExpressionAttributeNames: { "#o": "owner" }
            }).promise(),
            ddbClient.scan({ TableName: 'owners_daily_scores_2026' }).promise()
        ]);

        globalRosters = {};
        rosterData.Items.forEach(item => {
            if (!globalRosters[item.owner]) globalRosters[item.owner] = [];
            globalRosters[item.owner].push(`${item.player}-${item.ipl_team}`);
        });

        globalMatchScores = scoreData.Items;
        renderLeaderboard();
        populateMatchDropdown();

    } catch (err) {
        console.error("Data Fetch Error:", err);
        teamsContainer.innerHTML = "<p style='color:red;'>Error connecting to DynamoDB.</p>";
    }
}

function renderLeaderboard() {
    const totals = {};
    globalMatchScores.forEach(item => {
        totals[item.owner] = (totals[item.owner] || 0) + (parseFloat(item.match_score) || 0);
    });

    const sortedOwners = Object.keys(globalRosters).sort((a, b) => (totals[b] || 0) - (totals[a] || 0));
    
    teamsContainer.innerHTML = "";
    sortedOwners.forEach(ownerName => {
        const score = totals[ownerName] || 0;
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-row';
        const playerList = globalRosters[ownerName].map((p, i) => `<li><span class="rank">${i + 1}</span> ${p}</li>`).join('');

        teamDiv.innerHTML = `
            <div class="team-info"><h2>${ownerName}</h2><div class="score-badge">${score.toLocaleString()} pts</div></div>
            <div class="player-grid"><ul>${playerList}</ul></div>`;
        teamsContainer.appendChild(teamDiv);
    });
}

// 5. Matches View Logic
function populateMatchDropdown() {
    // 1. Extract unique match IDs and names
    const matchesMap = new Map();
    globalMatchScores.forEach(item => {
        const id = parseInt(item.match_id);
        if (!matchesMap.has(id)) {
            // Store the name associated with this ID
            matchesMap.set(id, item.match_name || "TBD");
        }
    });

    // 2. Sort match IDs in descending order (highest first)
    const sortedIds = Array.from(matchesMap.keys()).sort((a, b) => b - a);

    // 3. Clear and populate
    matchSelect.innerHTML = '<option value="">-- Select Match --</option>';
    sortedIds.forEach(id => {
        const name = matchesMap.get(id);
        const opt = document.createElement('option');
        opt.value = id;
        // Format: "10: CSK vs RCB"
        opt.textContent = `${id}: ${name}`;
        matchSelect.appendChild(opt);
    });
}

matchSelect.addEventListener('change', async (e) => {
    const mId = e.target.value;
    if (!mId) return;

    matchDetailsArea.innerHTML = "<p style='text-align:center;'>Loading Match Details...</p>";

    try {
        const data = await ddbClient.query({
            TableName: 'matches_2026',
            KeyConditionExpression: "match_id = :mid",
            ExpressionAttributeValues: { ":mid": mId }
        }).promise();

        renderMatchTables(data.Items, mId);
    } catch (err) {
        console.error(err);
        matchDetailsArea.innerHTML = "Error fetching player points.";
    }
});

// Function to fetch replacements for a specific match
async function fetchMatchReplacements(mId) {
    try {
        const data = await ddbClient.query({
            TableName: 'replacements_2026',
            KeyConditionExpression: "match_id = :mid",
            ExpressionAttributeValues: { ":mid": mId }
        }).promise();
        return data.Items;
    } catch (err) {
        console.error("Error fetching replacements:", err);
        return [];
    }
}

async function renderMatchTables(playerPoints, mId) {
    matchDetailsArea.innerHTML = "<p style='text-align:center;'>Loading Match Details...</p>";
    
    // Fetch replacements for this match
    const replacements = await fetchMatchReplacements(mId);

    matchDetailsArea.innerHTML = `
        <div class="match-name-badge">
            ${playerPoints[0].match_name}
        </div>
    `;

    Object.keys(globalRosters).forEach(owner => {
        const ownerReplacements = replacements.filter(r => r.owner === owner);
        const benchedNames = ownerReplacements.map(r => r.benching_player.toLowerCase());
        const replacementNames = ownerReplacements.map(r => r.replacement_player.toLowerCase());

        // Identify players to show: original owned players + any replacements
        const ownerRoster = globalRosters[owner].map(p => p.split('-')[0].toLowerCase());
        const allRelevantNames = [...new Set([...ownerRoster, ...replacementNames])];
        
        const relevantPoints = playerPoints.filter(p => allRelevantNames.includes(p.player.toLowerCase()));
        const ownerTotal = relevantPoints.reduce((sum, p) => sum + p.total_points, 0);

        const tableHTML = `
            <div class="team-row" style="flex-direction:column; padding:20px; align-items:center;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; border-bottom:1px solid #475569; padding-bottom:10px;">
                    <h2 style="color:#facc15; margin:0;">${owner}</h2>
                    <div class="score-badge" style="font-size:1.1rem;">${ownerTotal} pts</div>
                </div>
                <table class="match-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Player</th>
                            <th>🏏</th> <!-- Batting -->
                            <th>⚾️</th> <!-- Bowling -->
                            <th>🧤</th> <!-- Fielding -->
                            <th>🏅</th> <!-- MOM -->
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${relevantPoints.map(p => {
                            let displayName = p.player;
                            if (benchedNames.includes(p.player.toLowerCase())) {
                                displayName = '⬅️ ' + displayName;
                            } else if (replacementNames.includes(p.player.toLowerCase())) {
                                displayName = '➡️ ' + displayName;
                            }
                            return `
                                <tr>
                                    <td style="text-align: left;">${displayName}</td>
                                    <td>${p.batting_points}</td>
                                    <td>${p.bowling_points}</td>
                                    <td>${p.fielding_points}</td>
                                    <td>${p.mom_points}</td>
                                    <td><b style="color: #facc15;">${p.total_points}</b></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        matchDetailsArea.innerHTML += tableHTML;
    });
}

// 6. Navigation Switching
function showSection(section) {
    [teamsContainer, matchesContainer, rulesContainer, statsContainer].forEach(c => c.style.display = 'none');
    [homeBtn, matchesBtn, rulesBtn, statsBtn].forEach(b => b.classList.remove('active'));

    if (section === 'home') {
        teamsContainer.style.display = 'block';
        homeBtn.classList.add('active');
    } else if (section === 'matches') {
        matchesContainer.style.display = 'block';
        matchesBtn.classList.add('active');
    } else if (section === 'stats') {
        statsContainer.style.display = 'block';
        statsBtn.classList.add('active');
        renderStats(); // Calculate stats when clicking the tab
    } else {
        rulesContainer.style.display = 'block';
        rulesBtn.classList.add('active');
    }
}

async function renderStats() {
    // Check if we already have the data cached
    if (globalStatsData) {
        displayStatsHTML(globalStatsData.playerRecords, globalStatsData.allReplacements);
        return;
    }

    statsArea.innerHTML = "<p style='text-align:center;'>Calculating Tournament Stats...</p>";

    try {
        // Only Scan if the cache is empty
        const [playerData, replacementData] = await Promise.all([
            ddbClient.scan({ TableName: 'matches_2026' }).promise(),
            ddbClient.scan({ TableName: 'replacements_2026' }).promise()
        ]);

        // Cache the results globally
        globalStatsData = {
            playerRecords: playerData.Items,
            allReplacements: replacementData.Items
        };

        displayStatsHTML(globalStatsData.playerRecords, globalStatsData.allReplacements);
    } catch (err) {
        console.error("Stats Error:", err);
        statsArea.innerHTML = "<p style='color:red;'>Error loading tournament stats.</p>";
    }
}

function displayStatsHTML(playerRecords, allReplacements) {
    const getPlayedBy = (playerName, matchId) => {
        const pNameLower = playerName.toLowerCase();
        const mIdStr = matchId.toString();

        const replacementRecord = allReplacements.find(r => 
            r.match_id === mIdStr && r.replacement_player.toLowerCase() === pNameLower
        );
        if (replacementRecord) return replacementRecord.owner;

        const isBenched = allReplacements.some(r => 
            r.match_id === mIdStr && r.benching_player.toLowerCase() === pNameLower
        );
        if (isBenched) return "Benched";

        for (const [owner, players] of Object.entries(globalRosters)) {
            if (players.some(p => p.toLowerCase().split('-')[0] === pNameLower)) return owner;
        }
        return "Unsold";
    };

    // --- 1. Top Franchise Performances (🚀) ---
    const topOwnerMatches = [...globalMatchScores]
        .sort((a, b) => (parseFloat(b.match_score) || 0) - (parseFloat(a.match_score) || 0))
        .slice(0, 10);

    // --- 2. MVP of the Season (🔥) ---
    const playerTotals = {};
    playerRecords.forEach(p => {
        const owner = getPlayedBy(p.player, p.match_id);
        if (owner !== "Benched" && owner !== "Unsold") {
            playerTotals[p.player] = (playerTotals[p.player] || 0) + (parseInt(p.total_points) || 0);
        }
    });
    const topPlayersCumulative = Object.entries(playerTotals)
        .sort((a, b) => b[1] - a[1]) // Correct numeric sort for entries
        .slice(0, 10);

    // --- 3. Top Player Performances (💥) ---
    const topPlayerMatches = [...playerRecords]
        .sort((a, b) => (parseInt(b.total_points) || 0) - (parseInt(a.total_points) || 0))
        .slice(0, 10);

    statsArea.innerHTML = `
        ${renderStatsTable("🚀 Top Franchise Performances (Single Match)", ["Franchise", "Points", "Match"], 
            topOwnerMatches.map(m => [m.owner, `<b>${m.match_score}</b>`, `${m.match_id}: ${m.match_name}`]))}
        
        ${renderStatsTable("🔥 MVP of the Season", ["Franchise", "Player", "Points"], 
            topPlayersCumulative.map(([name, pts]) => {
                let originalOwner = "Unsold";
                for (const [owner, players] of Object.entries(globalRosters)) {
                    if (players.some(p => p.toLowerCase().split('-')[0] === name.toLowerCase())) originalOwner = owner;
                }
                return [originalOwner, name, `<b>${pts}</b>`];
            }))}
        
        ${renderStatsTable("💥 Top Player Performances (Single Match)", ["Franchise", "Player", "Points", "Match"], 
            topPlayerMatches.map(p => {
                const playedBy = getPlayedBy(p.player, p.match_id);
                const isReplacement = allReplacements.some(r => 
                    r.match_id === p.match_id.toString() && r.replacement_player.toLowerCase() === p.player.toLowerCase()
                );
                const displayName = isReplacement ? `➡️ ${p.player}` : p.player;
                return [playedBy, displayName, `<b>${p.total_points}</b>`, `${p.match_id}: ${p.match_name}`];
            }))}
    `;
}

function renderStatsTable(title, headers, rows) {
    return `
        <div class="team-row" style="flex-direction:column; padding:20px; margin-bottom:40px; align-items:center;">
            <h2 style="color:#facc15; margin-bottom:15px; text-align:center;">${title}</h2>
            <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table class="match-table" style="min-width: 100%;">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

homeBtn.addEventListener('click', () => showSection('home'));
matchesBtn.addEventListener('click', () => showSection('matches'));
statsBtn.addEventListener('click', () => showSection('stats'));
rulesBtn.addEventListener('click', () => showSection('rules'));

window.onload = loadDashboardData;
