// Update these scores daily
const teamScores = {
    "Nandyala Keshava": 165,
    "Kurnool Bittu": 131,
    "Nizamabad Simham": 60,
    "Warangal Raju": 349,
    "Nellore Ganga": 212
};

const fantasyLeague = {
    "Nandyala Keshava": ["Markram", "Marsh", "Gill", "Iyer", "Patidar",
        "Stubbs", "KL Rahul", "Hetmyer", "Rahane", "Hardik Pandya",
        "Marco Jansen", "Riyan Parag", "Lockie Ferguson", "Rabada", "Shami"],
    "Kurnool Bittu": ["Ishan Kishan", "Salt", "Prabhsimran Singh", "Seifert", "Ruturaj Gaikwad",
        "Sai Sudarshan", "Ayush Badoni", "Pathum Nisanka", "Shivam Dube", "NKR",
        "Harpreet Brar", "Bumrah", "Kuldeep", "Sai Kishore", "Matt henry"],
    "Nizamabad Simham": ["Klaasen", "Samson", "Butler", "Dewald Brevis", "Ayush Mahatre",
        "Will jacks", "Axar Patel", "Santner", "Jacob Bethell", "Shashank Singh",
        "Bhuvi", "Noor Ahmed", "Chahal", "Khaleel Ahmed", "Mayank markande"],
    "Warangal Raju": ["Pant", "Jaiswal", "Head", "Rohit Sharma", "Virat kohli",
        "Vaibhav Suryavamshi", "Nehal Wadhera", "Cameron Green", "Miller", "Stoinis",
        "Varun Chakravarthy", "Rashid Khan", "Hazlewood", "Arshdeep Singh", "Akeal hosein"],
    "Nellore Ganga": ["Abhishek Sharma", "Priyansh Arya", "SKY", "Tilak Varma", "Tim David",
        "Pooran", "Narine", "Krunal Pandya", "Boult", "Deepak Chahar",
        "Harshit Rana", "Suyash Sharma", "Fin Allen", "Raghuvanshi", "Jitesh Sharma"]
};

function displayTeams() {
    const container = document.getElementById('teams-container');
    
    // Sort teams by score (Highest first)
    const sortedTeams = Object.keys(fantasyLeague).sort((a, b) => teamScores[b] - teamScores[a]);

    sortedTeams.forEach(teamName => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-row';
        
        const playerList = fantasyLeague[teamName].map((p, i) => 
            `<li><span class="rank">${i + 1}</span> ${p || "---"}</li>`
        ).join('');

        teamDiv.innerHTML = `
            <div class="team-info">
                <h2>${teamName}</h2>
                <div class="score-badge">${teamScores[teamName]} pts</div>
            </div>
            <div class="player-grid">
                <ul>${playerList}</ul>
            </div>
        `;
        container.appendChild(teamDiv);
    });
}

window.onload = displayTeams;
