// 1. Initialize AWS SDK
AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:4b45cc3d-c755-482d-9058-059ca971579b'
});

const ddbClient = new AWS.DynamoDB.DocumentClient();

// 2. Global Data Stores (to avoid re-fetching)
let globalRosters = {};
let globalMatchScores = [];

// 3. DOM Elements
const homeBtn = document.getElementById('home-btn');
const matchesBtn = document.getElementById('matches-btn');
const rulesBtn = document.getElementById('rules-btn');

const teamsContainer = document.getElementById('teams-container');
const matchesContainer = document.getElementById('matches-container');
const rulesContainer = document.getElementById('rules-container');

const matchSelect = document.getElementById('match-id-select');
const matchDetailsArea = document.getElementById('match-details-area');

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
    // Convert match_ids to numbers and find max
    const matchIds = globalMatchScores.map(item => parseInt(item.match_id));
    const maxId = Math.max(...matchIds);

    for (let i = 1; i <= maxId; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Match ${i}`;
        matchSelect.appendChild(opt);
    }
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
                        <tr><th>Player</th><th>Batting</th><th>Bowling</th><th>Fielding</th><th>MOM</th><th>Total</th></tr>
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
    [teamsContainer, matchesContainer, rulesContainer].forEach(c => c.style.display = 'none');
    [homeBtn, matchesBtn, rulesBtn].forEach(b => b.classList.remove('active'));

    if (section === 'home') {
        teamsContainer.style.display = 'block';
        homeBtn.classList.add('active');
    } else if (section === 'matches') {
        matchesContainer.style.display = 'block';
        matchesBtn.classList.add('active');
    } else {
        rulesContainer.style.display = 'block';
        rulesBtn.classList.add('active');
    }
}

homeBtn.addEventListener('click', () => showSection('home'));
matchesBtn.addEventListener('click', () => showSection('matches'));
rulesBtn.addEventListener('click', () => showSection('rules'));

window.onload = loadDashboardData;
