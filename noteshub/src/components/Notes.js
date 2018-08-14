import Vex from 'vexflow';
import React, {Component} from 'react';

const {
    Accidental,
    Formatter,
    Stave,
    StaveNote,
    Renderer,
    StaveConnector
} = Vex.Flow;

const SCHEME_WIDTH = 350;

const SPACE_BETWEEN_STAVES = 120;
const SPACE_BETWEEN_GRAND_STAVES = 260;
const BAR_MIN_WIDTH = 100;
const PADDING_TOP = 50;
const PADDING_LEFT = 50;
const COEFFICIENT = 1;

const SHEET_MIN_WIDTH = 600;
const FIRST_NOTE_SPACE = 10;
const LAST_NOTE_SPACE = 10;

export default class Notes extends Component {

  constructor() {
    super();
    this.scale = 100 / 100;
    this.width = window.innerWidth;
    this.svgWidth = Math.max(this.width , SHEET_MIN_WIDTH) / this.scale;
    this.sheetWidth = this.svgWidth - PADDING_LEFT * 2;

    this.beams = [];
    this.tuplets = [];

    this.openedTies = {};
    this.ties = [];

    this.rowFirstBars = [];
    this.rowLastBars = [];


     this.signature = 'C';
  }

    render() {
        return <div ref="outer" style={{}}>
        </div>;
    }

    disributeValue(arr, value, precision) {
      const sum = arr.reduce((sum, value) => sum + value, 0);

      const percentages = arr.map(value => value / sum);

      const valueDistribution = percentages.map(percentage => {
        const factor = Math.pow(10, precision);
        return Math.round(value * percentage * factor) / factor;
      });

      return valueDistribution;
    }

    componentDidMount() {

      const sheet = this.props.sheet;
      console.log(sheet)

      const trebleStave = new Stave(0, 0, 800);  // x, y, width
      const bassStave = new Stave(0, SPACE_BETWEEN_STAVES, 800);  // x, y, width
      let key = []
      var duration
      let partCount = sheet.Parts.length
      console.log("total parts number: " + partCount)

      let measureCount = sheet.Parts[0].Measures.length
      console.log("total measures number: " + measureCount)
      sheet.Parts.forEach(part => {
        part.Measures.forEach(measure => {
          for(let i in measure.Notes) {
            let note = measure.Notes[i];
            let pitch = note.Pitch;
            if(pitch.Step != ""){
              key.push(pitch.Step + "/"+pitch.Octave);
              duration = note.Duration
            }
          }
        });
      });


      let chord = [new StaveNote({
        keys: key,
        duration: duration.toString(),
      })];

      const svgContainer = document.createElement('div');
      const renderer = new Renderer(svgContainer, Renderer.Backends.SVG);
      const ctx = renderer.getContext();

      ctx.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

      let rowsCounter = 0;
      let currentWidth = 0;
      const currentRowBars = [];
      const widthArray = [];
      let firstRow = true;

      const sectionsLength = 10;

      trebleStave.addClef("treble").addTimeSignature("4/4").addKeySignature(this.signature).setContext(ctx).draw();
      bassStave.addClef("bass").addTimeSignature("4/4").addKeySignature(this.signature).setContext(ctx).draw();

      var startX = this.unifyNotesStartX(trebleStave, bassStave);

      // var barWidth = minTotalWidth + (startX - 0) + FIRST_NOTE_SPACE + LAST_NOTE_SPACE;


      const lineLeft = new StaveConnector(trebleStave, bassStave).setType(1);
      const lineRight = new StaveConnector(trebleStave, bassStave).setType(0);

      lineLeft.setContext(ctx).draw();
      lineRight.setContext(ctx).draw();

      const bb = Formatter.FormatAndDraw(ctx, trebleStave, chord);

      const svg = svgContainer.childNodes[0];
      const padding = 10;
      const half = padding / 2;
      svg.style.top = -bb.y + half + Math.max(0, (100 - bb.h) * 2/3) + "px";
      svg.style.height = Math.max(100, bb.h);
      svg.style.left = PADDING_LEFT;
      svg.style.width = 100 + "px";
      svg.style.position = "absolute";
      svg.style.overflow = "visible";
      svgContainer.style.height = Math.max(100, bb.h + padding) + "px";
      svgContainer.style.width = 100 + "px";
      svgContainer.style.position = "relative";
      svgContainer.style.display = "inlineBlock";

        // noinspection JSUnresolvedVariable
      this.refs.outer.appendChild(svgContainer);
    }

    unifyNotesStartX(trebleStave, bassStave) {
      const startX = Math.max(trebleStave.getNoteStartX(), bassStave.getNoteStartX());
      trebleStave.setNoteStartX(startX);
      bassStave.setNoteStartX(startX);
      return startX
    }
}