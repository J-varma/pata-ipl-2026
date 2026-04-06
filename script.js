// Initialize AWS
AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:4b45cc3d-c755-482d-9058-059ca971579b'
});

const ddbClient = new AWS.DynamoDB.DocumentClient();

async function displayTeams() {
    const container = document.getElementById('teams-container');
    container.innerHTML = "<p style='text-align:center;'>Fetching IPL Standings...</p>";

    try {
        // 1. Parallel Fetch
        const [rosterData, scoreData] = await Promise.all([
            ddbClient.scan({ TableName: 'owners_2026' }).promise(),
            ddbClient.scan({ TableName: 'owners_daily_scores_2026' }).promise()
        ]);

        // 2. Process Rosters
        const rosters = {};
        rosterData.Items.forEach(item => {
            if (!rosters[item.owner]) rosters[item.owner] = [];
            rosters[item.owner].push(`${item.player}-${item.ipl_team}`);
        });

        // 3. Process Cumulative Scores
        const totals = {};
        scoreData.Items.forEach(item => {
            totals[item.owner] = (totals[item.owner] || 0) + (parseFloat(item.match_score) || 0);
        });

        container.innerHTML = ""; // Clear loader

        // 4. Sort Owners by Total Score
        const sortedOwners = Object.keys(rosters).sort((a, b) => 
            (totals[b] || 0) - (totals[a] || 0)
        );

        // 5. Render to UI
        sortedOwners.forEach(ownerName => {
            const score = totals[ownerName] || 0;
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team-row';
            
            const playerList = rosters[ownerName].map((p, i) => 
                `<li><span class="rank">${i + 1}</span> ${p}</li>`
            ).join('');

            teamDiv.innerHTML = `
                <div class="team-info">
                    <h2>${ownerName}</h2>
                    <div class="score-badge">${score.toLocaleString()} pts</div>
                </div>
                <div class="player-grid">
                    <ul>${playerList}</ul>
                </div>
            `;
            container.appendChild(teamDiv);
        });

    } catch (err) {
        console.error("Data Fetch Error:", err);
        container.innerHTML = "<p style='color:red;'>Error connecting to DynamoDB. Check your Cognito Identity Pool ID.</p>";
    }
}

// Toggle Logic
const toggleBtn = document.getElementById('toggle-btn');
const teamsContainer = document.getElementById('teams-container');
const rulesContainer = document.getElementById('rules-container');

toggleBtn.addEventListener('click', () => {
    if (rulesContainer.style.display === 'none') {
        // Switch to Rules view
        teamsContainer.style.display = 'none';
        rulesContainer.style.display = 'block';
        toggleBtn.textContent = 'Home';
    } else {
        // Switch to Home (Scores) view
        rulesContainer.style.display = 'none';
        teamsContainer.style.display = 'block';
        toggleBtn.textContent = 'Rules';
    }
});

window.onload = displayTeams;
