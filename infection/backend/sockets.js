const sockets = require('socket.io');
const store = require('./redux/store');
const { assignRoles } = require('./redux/users/actionCreator_users');
const { newUser } = require('./redux/users/actionCreator_users');
const { incrementRound } = require('./redux/rounds/actionCreator_rounds');
const { voteCure, voteSabotage, resetVotes } = require('./redux/cureOrSabotage/actionCreator_cureOrSabotage');
const { leaderLoopCreator } = require('./assignLeaderHelper');
const { scientistRoundWin, infiltratorRoundWin, restartGame } = require('./redux/game/actionCreator_game');
const chalk = require('chalk');
const log = console.log;

module.exports = (server) => {
  const io = sockets(server);
  var leaderLoop;
    
  io.on('connection', (socket) => {
    socket.on('join game', (playerProps) => {
      const game = playerProps.game;
      const username = playerProps.username;
      socket.game = game;
      socket.username = username;

      store.dispatch(newUser(username, game, socket.id));

      const getPlayerProfile = () => {
        const playersInGame = store.getState().users;
        const team = playersInGame.map(user => user.username);
        log(chalk.bold.cyan(team, 'team'));
        const infiltrators = [];
        playersInGame.forEach(user => {
          if (user.infiltrator === true) {
            infiltrators.push(user.username);
          }
        });
        playersInGame.forEach(user => {
          if (user.infiltrator === true) {
            user.infiltrators = infiltrators;
          }
          user.team = team;
          io.to(user.socketID).emit('game start', user);
        });
        setTimeout(() => {
          store.dispatch(incrementRound());
          let round = store.getState().round.round;
          leaderLoop = leaderLoopCreator(store.getState().users);
          let roundLeader = leaderLoop[round - 1];
          io.in(game).emit('start round', 
            {leader: roundLeader.username, round} 
          );
        }, 20000);  
      };         

      store.getState().users.length === 5 
        ? store.dispatch(assignRoles()) && getPlayerProfile()
        : log(chalk.bold.cyan('User added. Waiting for more users to start game.'));
      //SERVER CONNECTS PLAYER TO GAME---------------------------------------------------------------------------
      socket.join(game);
    });
    const users = store.getState().users;
    log(chalk.bold.bgCyan(users, 'users'));
    //LEADER CHOSE TEAM----------------------------------------------------------------------------------------
    socket.on('deploy team', (team) => {
      io.in(socket.game).emit('team chosen', team);   
    });
    //CURE OR SABOTAGE CHOSEN-----------------------------------------------------------------------------------
    socket.on('chose cure or sabotage', (choice) => {
      choice === 'CURE'
        ? store.dispatch(voteCure())
        : store.dispatch(voteSabotage());
      
      let results = store.getState().cureOrSabotage.voteStatus;
      let totalVotes = store.getState().cureOrSabotage.deployedVoteCount;
      
      log(chalk.bold.black(`
        ${results}, 'results ... 1 for sabotage ... 0 for cure', 
        ${totalVotes}, 'totalVotes', 
        ${store.getState()}, 'STORE after vote dispatch'`
      ));
      
      (totalVotes === 3 && results === 1)
        ? store.dispatch(infiltratorRoundWin())
        : log(chalk.magenta('not a great day to be a scientist'));
        
      (totalVotes === 3 && results === 0)
        ? store.dispatch(scientistRoundWin())
        : log(chalk.magenta('great day to be a scientist'));  

      totalVotes === 3
        ? io.in(socket.game).emit('mission result', results) &&

          setTimeout(function () {
            let scientistWinTotal = store.getState().game.scientistWins;  
            let infiltratorWinTotal = store.getState().game.infiltratorWins;  
            let winner;

            if (scientistWinTotal === 2) {
              winner = true;
              io.in(socket.game).emit('game over', winner);
            //DISCONNECT SOCKET-----------------------------------------------------------------------------------------
              socket.disconnect(true);
            } else if (infiltratorWinTotal === 2) {
              winner = false;
              io.in(socket.game).emit('game over', winner);
            //DISCONNECT SOCKET-----------------------------------------------------------------------------------------
              socket.disconnect(true);
            } else { 
              store.dispatch(incrementRound());
              store.dispatch(resetVotes());
              let round = store.getState().round.round;
              let roundLeader = leaderLoop[round - 1];
              io.in(socket.game).emit('start round', {leader: roundLeader.username, round});     
            }
          }, 3000)

        : log(chalk.red('Waiting for more votes'));
    });
    log(chalk.blue(store.getState(), 'store.getState() at end of round'));
  });
};
