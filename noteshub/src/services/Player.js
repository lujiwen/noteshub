import SoundFont from 'soundfont-player'
import Transposer from './Transposer'
import { durations } from './constants'

class Player {
  constructor() {
    // q = 1 = 60bpm
    this.nBeats = 4;
  }

  loadSamples(callback) {

    function localUrl(name) {
      return 'instruments/' + name + '.js'
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext || false;
    if (!AudioContext) {
      alert(`Sorry, but the Web Audio API is not supported by your browser.
             Please, consider upgrading to the latest version or downloading 
             Google Chrome or Mozilla Firefox`);
      return callback();
    }
    const ac = new AudioContext();

    SoundFont.instrument(ac, 'piano', {
      nameToUrl: localUrl,
      gain: 3,
      release: 1
    }).then((instrument) => {
      this.instrument = instrument;
      callback();
    }).catch(function (err) {
      console.log('err', err)
    })

  }


  parceVoice(voice, symbol, vInd, bInd, pInd, sInd) {
    const notesDurationDenominators = {};
    let offset = 0;
    this.beatCounter = 0;
    const notesToSwing = [];

    // ограничения по мультиолям
    // поддерживаются только с основанием 2
    // вложенность не поддерживается
    if (voice.tuplets) {
      voice.tuplets.forEach(tuplet => {
        const { from, to } = tuplet;
        for (var x = from; x < to; x++) {
          notesDurationDenominators[x] = 2 / (to - from);
        }
      })
    }

    voice.notes.forEach((note, index) => {
      const noteId = `${sInd}-${pInd}-${bInd}-${symbol}-${vInd}-${index}`;
      const vexDuration = note.dur.toLowerCase();
      const isRest = vexDuration.indexOf('r') !== -1;

      let normalDuration = durations[isRest ? vexDuration.replace('r', '') : vexDuration];

      if (note.dots) {
        normalDuration = normalDuration * 1.5;
      }

      let duration = normalDuration * this.timeDenominator;
      if (notesDurationDenominators[index]) {
        duration = duration * notesDurationDenominators[index]
        normalDuration = normalDuration * notesDurationDenominators[index]
      }

      // swing feel
      if (this.swing && normalDuration === 0.5 && notesDurationDenominators[index] === undefined) {
        const beat = Math.floor(this.beatCounter)
        if (!notesToSwing[beat]) {
          notesToSwing[beat] = [];
        }
        notesToSwing[beat].push({ id: noteId })
      }

      // форшлаги, создать events  и привязать к event первой клавиши ноты
      const graceNotes = [];
      if (note.grace) {
        note.grace.notes.forEach((gn, gInd) => {
          const { keys, dur: duration} = gn;

          keys.forEach(function (key, keyIndex) {
            const { trPitch: pitch } = this.transposer.transpose(key, duration);
            //пока все форшлаги играть как 64
            graceNotes.push( {
              id: `${noteId}-${gInd}`,
              note: pitch,
              time: (this.currentTime + offset),
              duration: durations["64"] * this.timeDenominator,
              isRest: false,
              gain: symbol === 't' ? 3 : 2,
              gInd
            })
          }.bind(this))
        })
      }

      this.beatCounter = this.beatCounter + normalDuration;

      note.keys.forEach((key, keyIndex) => {

        const { trPitch: pitch } = this.transposer.transpose(key, note.dur);

        const event = {
          id: noteId,
          note: pitch,
          time: (this.currentTime + offset),
          duration,
          isRest,
          gain: symbol === 't' ? 3 : 2
        }

        // привяжем все форшлаги к событию первой ноты 
        if (keyIndex === 0 && graceNotes.length) {
          this.graceNotesEvents.push({event, graceNotes})
        }

        if (key.ties) {
          key.ties.forEach(function (t, i) {
            if (t.type === 'start') {
              this.openedTies[pitch] = event
            } else {
              if (this.openedTies[pitch]) {
                this.ties.push({start:this.openedTies[pitch], stop:event})
                delete this.openedTies[pitch];
              }
            }
          }.bind(this))
        }

        this.events.push(event)
      });


      offset = offset + duration;
    });

    if (this.swing) {
      notesToSwing.forEach((notePair) => {
        if (notePair.length === 2) {
          let firstNoteId = notePair[0].id;
          let secondNoteId = notePair[1].id;
          this.events.forEach((ev) => {
            if (ev.id === firstNoteId) {
              ev.duration = ev.duration + this.swingExtraDuration;
            } else if (ev.id === secondNoteId) {
              ev.duration = ev.duration - this.swingExtraDuration;
              ev.time = ev.time + this.swingExtraDuration;
            }
          })
        }
      })
    }
  };

  play() {

    const curEvent = this.events[this.curEventIndex];
    if (!curEvent.isRest && curEvent.duration) {
      this.instrument.play(curEvent.note, curEvent.time, curEvent);
    }

    if (this.follow && curEvent.id && curEvent.duration) {
      const el = document.getElementById(`vf-${curEvent.id}`);
      if (el !== null) {
        // window.scrollBy({ 
        //   top: x,
        //   left: 0, 
        //   behavior: 'smooth' 
        // });
        el.classList.add("currentNote");
        setTimeout(() => {
          el.classList.remove("currentNote");
        }, curEvent.duration * 1000);
      }
    }

    if (this.curEventIndex === this.events.length - 1) {
      return this.onFinishPlayingCallback();
    }

    const timeUntilNextEvent = this.events[this.curEventIndex + 1].time - curEvent.time;

    this.curEventIndex++;
    this.timerId = setTimeout(() => { this.play() }, timeUntilNextEvent * 1000);
  }

  start(sections, { tempo, swing, key, follow }) {
    if (this.onStartPlayingCallback) {
      this.onStartPlayingCallback();
    }

    this.follow = follow;

    this.transposer = new Transposer(key);

    this.events = [];
    this.curEventIndex = 0;
    this.currentTime = 0;
    this.timeDenominator = 60 / tempo;

    // swing feel implementation
    this.swing = swing;
    this.swingExtraDuration = (this.timeDenominator * 2 / 3) - (this.timeDenominator / 2);

    //ties
    this.openedTies = {};
    this.ties = [];

    //grace notes
    this.graceNotesEvents = [];


    sections.forEach((section, sInd) => {
      if (section !== null) {
        section.phrases.forEach((phrase, pInd) => {
          phrase.bars.forEach((bar, bInd) => {
            this.transposer.resetAccidentals();
            bar.trebleVoices.forEach((voice, vInd) => {
              this.parceVoice(voice, 't', vInd, bInd, pInd, sInd);
            });

            bar.bassVoices.forEach((voice, vInd) => {
              this.parceVoice(voice, 'b', vInd, bInd, pInd, sInd);
            });
            this.currentTime += this.nBeats * this.timeDenominator;
          });
        });
      }
    });

    this.ties.forEach(tie => {
      tie.start.duration = tie.start.duration + tie.stop.duration
      tie.stop.duration = 0;
    })

    this.graceNotesEvents.forEach(e => {
      let eventTime = e.event.time;
      const gnEvents = e.graceNotes.reverse().map(gn => {
        eventTime = eventTime - gn.duration;
        //немного увеличим длительность чтобы придать грязного звучания
        return {...gn, time: eventTime, duration: gn.duration * 4}
      }) 
      this.events.push(...gnEvents)
    })

    this.events.sort(function (a, b) {
      return a.time - b.time
    })

    if (this.events) {
      this.play();
    }
  }

  stop() {
    if (this.timerId) {
      //this.instrument.stop();
      clearTimeout(this.timerId);
      this.timerId = null;
      this.curEventIndex = 0;
      //this.events.length = 0;
    }
  }

  onFinishPlaying(callback) {
    this.onFinishPlayingCallback = callback;
  }

  onStartPlaying(callback) {
    this.onStartPlayingCallback = callback;
  }
}

export default Player