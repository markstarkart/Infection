import React, { Component} from 'react';
import { Grid, Row, Col } from 'react-bootstrap';

import socket from '../socket';

import Roles from '../views/game/roles/roles';
import Round from '../views/game/round/round';
import Mission from '../views/game/mission/mission';
import MissionResults from '../views/game/missionResults/missionResults';
import WaitingForTeam from '../views/game/waiting/waitingForTeam';
import GameOver from '../views/game/gameOver/gameOver';
import GameStatus from '../views/game/gameStatus/gameStatus';
import Header from '../views/game/shared/header';

class Game extends Component {
  constructor(props) {
    super(props);

    this.checkGameStatus = this.checkGameStatus.bind(this);

    this.state = {
      
      id: undefined,
      username: undefined,
      infiltrator: false,
      round: 0,
      leader: undefined,
      teamAssembled: false,
      team: [],
      missionRoster: [],
      missionActive: false,
      gameOver: false, 
      choiceMade: undefined,
      missionResults: [undefined, undefined, undefined],
      scientistsWin: true,
        
    }
    
  }
  componentDidMount() {
    this.checkGameStatus();
  }

  checkGameStatus() {
    socket.on('game start', ({username, infiltrator, team}) => {
      this.setState({ username, teamAssembled: true, infiltrator, team }, () => {
      })
    })
    socket.on('start round', (data) => {
      this.setState({ round: data.round, leader: data.leader, missionRoster: [], missionActive: false, 
        choiceMade: undefined })
    })
    socket.on('team chosen', (team) => {
      this.setState({ missionRoster: team , missionActive: true})
    })
    socket.on('mission result', (result) => {
      if (result === 0) {
        result = 'success'
      } else if (result === 1) {
        result = 'fail'
      }
      const updatedResults = this.state.missionResults.map((current, i) => {
        if (i === this.state.round - 1) {
          return result;
        } else {
          return current;
        }
      }) 
      this.setState({ missionResults: updatedResults });
    })
    socket.on('game over', (winner) => {
      console.log(winner, 'winner in client');
      this.setState({ gameOver: true, scientistsWin: winner }, () => {
        console.log('gameOver:', this.state.gameOver, 'winner:', winner, 'true: scientists, false: infiltrators FROM SERVER');
      })
    })
  }

  handleSelectRosterEntryClick(member) {
    this.state.missionRoster.length === 3
      ? console.log(this.state.missionRoster)
      : this.state.missionRoster.includes(member)
        ? console.log(this.state.missionRoster)
        : this.setState({ missionRoster: [...this.state.missionRoster, member] });
  }

  handleSubmitRoster() {
    socket.emit('deploy team', this.state.missionRoster)
    this.setState({ missionActive: true });
  }

  handleOnMissionClick(choice) {
    this.setState({choiceMade: choice }, () =>
      socket.emit('chose cure or sabotage', choice)
    );
  }
  
  render() {
    const game = this.state;

    return <Grid className="game">
      <br></br>
      <Header></Header>
      <br></br>
      <Row>
        <Col med={2}></Col>
        <Col med={8}>
          {
            !game.teamAssembled
              ? <WaitingForTeam></WaitingForTeam>
              : !game.round
                ? <Roles infiltrator={game.infiltrator}></Roles>
                : !game.missionActive
                  ? <Round
                    game={game}
                    handleSelectRosterEntryClick={this.handleSelectRosterEntryClick.bind(this)}
                    handleSubmitRoster={this.handleSubmitRoster.bind(this)}
                  ></Round>
                  : !game.missionResults[game.round - 1]
                    ? <Mission
                      choose={this.handleOnMissionClick.bind(this)}
                      choiceMade={game.choiceMade}
                      roster={game.missionRoster}
                      username={game.username}
                    ></Mission>
                    : !game.gameOver
                      ? <MissionResults
                        result={game.missionResults[game.round - 1]}
                      ></MissionResults>
                      : <GameOver scientistsWin={game.scientistsWin}></GameOver>
          }
        </Col>
        <Col med={2}></Col>
      </Row>
      <Row>
        <br></br>
        <br></br>
      </Row>
          <GameStatus missionResults={game.missionResults}></GameStatus>
    </Grid>
  }
}


export default Game;
