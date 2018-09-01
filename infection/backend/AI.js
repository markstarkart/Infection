// ******** AI LOGIC ******** //
// ******** PAL 3000 ******** //

const db = require('./database');

class PAL3000 {
  constructor(scientist, team, infiltrators) {
    this.scientist = scientist; // true or false
    this.team = team.filter(player => player !== 'PAL3000'); // players in the game, other than PAL
    this.playerRecords = this.team.reduce((records, player) => {
      records[player] = {
        name: player,
        missionSuccessRate: 0,
        numberOfMissions: 0,
        numberOfSuccesses: 0,
      };
      return records;
    }, {});
    // this.playerRecords = {
    //   player: {
    //     name: player,
    //     missionSuccessRate: %,
    //     numberOfMissions: number,
    //     numberOfSuccesses: number,
    //   },
    // }

    this.infiltrators = infiltrators; // array of infiltrators
    this.voted = false; // toggle to keep track of whether PAL has already voted
    this.isLeader = false; // toggle status of PAL as leader
  }

  // update player records
  updatePlayerRecords(result, roster) {
    // result: 0 = success, 1 = fail
    // roster = []; array of names
    // console.log(result, 'result AI.js 34');
    // console.log(roster, 'roster AI.js 35');
    let success;
    if (result === 0) {
      success = true;
    }
    // update each player's record as a % of missions with a success
    // iterate thru roster array
    roster.forEach(player => {
      // console.log(this.playerRecords[player], 'this.playerRecords[player] BEFORE AI.js 41');
      // increment the number of missions the player has participated in
      this.playerRecords[player].numberOfMissions += 1;
      if (success) {
        // increment the number of successful missions the player has participated in
        this.playerRecords[player].numberOfSuccesses += 1;
      }
      // calculate success rate
      this.playerRecords[player].missionSuccessRate =
        this.playerRecords[player].numberOfSuccesses /
        this.playerRecords[player].numberOfMissions;
      // console.log(this.playerRecords[player], 'this.playerRecords[player] AFTER AI.js 49');
    });
    // console.log(this.playerRecords, 'this.playerRecords');
  }

  // CURE vs. SABOTAGE choice
  cureOrSabotage(round, roster) {
    console.log(round, 'round AI.js 41'); // needs to be a number
    console.log(roster, 'roster AI.js 42'); // needs to be an array of players
    // IMPROVEMENTS:
    // if infiltrator, choose 'CURE' sometimes to be deceptive
    if (!this.scientist) {
      // if round 1 or small roster size: 90% CURE
      if (round === 1 || (this.team.length + 1) / roster.length > 3) {
        // 90% 'CURE' vote
        const random = Math.random();
        return random < 0.9 ? 'CURE' : 'SABOTAGE';
      } // if numberOfPlayers/rosterSize > 2 = 50% CURE
      if ((this.team.length + 1) / roster.length > 2) {
        // 50% 'CURE' vote
        const random = Math.random();
        return random < 0.5 ? 'CURE' : 'SABOTAGE';
      }
    }
    // if scientist choose 'CURE'
    return 'CURE';
  }

  // Leader Choosing Mission Roster
  chooseMissionRoster(numberOfPlayers) {
    console.log(numberOfPlayers, 'numberOfPlayers');
    // if scientist
    // if (this.scientist) {
    // choose players with the best mission success rate
    // sort team by highest success rate
    // create an array of players
    const teamSortedBySuccessRate = Object.values(this.playerRecords)
      .map(player => {
        // if a player hasn't been on a mission, set default success rate to 50%
        const playerDefault = player;
        if (!playerDefault.numberOfMissions) {
          playerDefault.missionSuccessRate = 0.5;
        }
        return playerDefault;
      })
      .sort((a, b) => b.missionSuccessRate - a.missionSuccessRate);
    // choose self and (numberOfPlayer - 1)
    return ['PAL3000'].concat(
      teamSortedBySuccessRate
        .map(player => player.name)
        .slice(0, numberOfPlayers - 1)
    );
    // }
    // Old method:
    // if infiltrator
    // choses self and (numberOfPlayers - 1) random players
    // shuffle the team
    // const shuffledTeam = this.team;
    // let l = shuffledTeam.length;
    // // While there remain players to shuffle
    // while (l) {
    //   // pick a random player's index from those remaining
    //   const i = Math.floor(Math.random() * (l -= 1));
    //   // swap the current player with the randomly seleted player
    //   [shuffledTeam[l], shuffledTeam[i]] = [shuffledTeam[i], shuffledTeam[l]];
    // }
    // return ['PAL3000'].concat(shuffledTeam.slice(0, numberOfPlayers - 1));
  }

  // Voting for mission team
  voteForMissionTeam(proposedRoster) {
    console.log(proposedRoster, 'proposedRoster');
    // checks if proposedRoster includes an Infiltrator
    const includesInfiltrator = proposedRoster.some(player =>
      this.infiltrators.includes(player)
    );
    // if PAL is leader
    if (this.isLeader) {
      return 'YES';
    }
    // if scientist
    if (this.scientist) {
      // check to see if each member of proposedRoster has > 50% mission success record
      const approveProposedRoster = proposedRoster
        // filter out PAL: he's not concerned with his own record, because he knows he's a scientist ;)
        .filter(player => player !== 'PAL3000')
        // create an array of the proposedRoster's success rates
        .map(player => this.playerRecords[player].missionSuccessRate)
        // if every rate is greater than 50%
        .every(rate => rate > 0.5);
      return approveProposedRoster ? 'YES' : 'NO';
    }
    // if infiltrator
    // if mission includes an infiltrator vote 'YES'
    // otherwise vote 'NO'
    return includesInfiltrator ? 'YES' : 'NO';
  }

  updateStats(winner) {
    // false = scientist won, true = infiltrators won
    if ((this.scientist && !winner) || (!this.scientist && winner)) {
      const update = { username: 'PAL3000', win: true };
      db.updateUserStats(update, () => console.log('PAL3000 stats updated'));
      // otherwise PAL3000 has lost the game
    } else {
      const update = { username: 'PAL3000', win: false };
      db.updateUserStats(update, () => console.log('PAL3000 stats updated'));
    }
  }
}

module.exports = {
  PAL3000,
};

const pal3000 = new PAL3000(true, ['Athena', 'Mark', 'Matt', 'Paul', 'PAL3000'], ['Paul', 'Mark']);
console.log(pal3000, 'pal3000');
console.log(pal3000.updatePlayerRecords(0, ['Athena', 'Matt']), 'updatePlayerRecords');
// console.log(pal3000.updatePlayerRecords(1, ['Athena', 'Matt']), 'updatePlayerRecords');
// console.log(pal3000.updatePlayerRecords(1, ['Athena', 'Matt']), 'updatePlayerRecords');

// console.log(pal3000.chooseMissionRoster(3), 'chooseMissionRoster');
// console.log(pal3000.cureOrSabotage(2, ['Paul', 'PAL3000']), 'cureOrSabotage');
console.log(pal3000.voteForMissionTeam(['Athena', 'Matt', 'PAL3000']), 'voteForMissionTeam');