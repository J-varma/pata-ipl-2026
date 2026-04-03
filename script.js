// Update these scores daily
const teamScores = {
    "Nandyala Keshava": 415,
    "Kurnool Bittu": 547,
    "Nizamabad Simham": 204,
    "Warangal Raju": 421,
    "Nellore Ganga": 397
};

const fantasyLeague = {
    "Nandyala Keshava": ["Markram-LSG", "Marsh-LSG", "Gill-GT", "Iyer-PBKS", "Patidar-RCB",
        "Stubbs-DC", "KL Rahul-DC", "Hetmyer-RR", "Rahane-KKR", "Hardik Pandya-MI",
        "Marco Jansen-PBKS", "Riyan Parag-RR", "Lockie Ferguson-PBKS", "Rabada-GT", "Shami-LSG"],
    "Kurnool Bittu": ["Ishan Kishan-SRH", "Salt-RCB", "Prabhsimran Singh-PBKS", "Seifert-KKR", "Ruturaj Gaikwad-CSK",
        "Sai Sudarshan-GT", "Ayush Badoni-LSG", "Pathum Nisanka-DC", "Shivam Dube-CSK", "NKR-SRH",
        "Harpreet Brar-PBKS", "Bumrah-MI", "Kuldeep-DC", "Sai Kishore-GT", "Matt Henry-CSK"],
    "Nizamabad Simham": ["Klaasen-SRH", "Samson-CSK", "Butler-GT", "Dewald Brevis-CSK", "Ayush Mahatre-CSK",
        "Will jacks-MI", "Axar Patel-DC", "Santner-MI", "Jacob Bethell-RCB", "Shashank Singh-PBKS",
        "Bhuvi-RCB", "Noor Ahmed-CSK", "Chahal-PBKS", "Khaleel Ahmed-CSK", "Mayank markande-MI"],
    "Warangal Raju": ["Pant-LSG", "Jaiswal-RR", "Head-SRH", "Rohit Sharma-MI", "Virat kohli-RCB",
        "Vaibhav Suryavamshi-RR", "Nehal Wadhera-PBKS", "Cameron Green-KKR", "Miller-GT", "Stoinis-PBKS",
        "Varun Chakravarthy-KKR", "Rashid Khan-GT", "Hazlewood-RCB", "Arshdeep Singh-PBKS", "Akeal hosein-CSK"],
    "Nellore Ganga": ["Abhishek Sharma-SRH", "Priyansh Arya-PBKS", "SKY-MI", "Tilak Varma-MI", "Tim David-RCB",
        "Pooran-LSG", "Narine-KKR", "Krunal Pandya-RCB", "Boult-MI", "Deepak Chahar-MI",
        "Harshit Rana-KKR", "Suyash Sharma-RCB", "Fin Allen-KKR", "Raghuvanshi-KKR", "Jitesh Sharma-RCB"]
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
