'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MetricsPanelCtrl = exports.D3BulletPanelCtrl = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sdk = require('app/plugins/sdk');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _kbn = require('app/core/utils/kbn');

var _kbn2 = _interopRequireDefault(_kbn);

var _config = require('app/core/config');

var _config2 = _interopRequireDefault(_config);

var _time_series = require('app/core/time_series2');

var _time_series2 = _interopRequireDefault(_time_series);

var _d3V = require('./external/d3.v3.min');

var d3 = _interopRequireWildcard(_d3V);

require('./css/panel.css!');

require('./external/d3bullet');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
//import * as d3 from '../bower_components/d3/d3.js';


var panelDefaults = {
  fontSizes: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70],
  fontTypes: ['Arial', 'Avant Garde', 'Bookman', 'Consolas', 'Courier', 'Courier New', 'Garamond', 'Helvetica', 'Open Sans', 'Palatino', 'Times', 'Times New Roman', 'Verdana'],
  colors: ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
  bullet: {
    titleFontSize: 22,
    subtitleFontSize: 18,
    outerEdgeCol: '#0099CC',
    innerCol: '#fff',
    pivotCol: '#999',
    needleCol: '#0099CC',
    unitsLabelCol: '#000',
    tickLabelCol: '#000',
    tickColMaj: '#0099CC',
    tickColMin: '#000',
    tickFont: 'Open Sans',
    titleFont: 'Open Sans',
    subtitleFont: 'Open Sans',
    titleCol: '#fff',
    subtitleCol: '#999',
    rangeCol: '#0099CC',
    measureCol: '#7eb26d',
    markerCol: '#000',
    tickCol: '#FFF',
    rangesColor: [],
    measuresColor: []
  }
};

var D3BulletPanelCtrl = function (_MetricsPanelCtrl) {
  _inherits(D3BulletPanelCtrl, _MetricsPanelCtrl);

  function D3BulletPanelCtrl($scope, $injector, alertSrv) {
    _classCallCheck(this, D3BulletPanelCtrl);

    // merge existing settings with our defaults
    var _this = _possibleConstructorReturn(this, (D3BulletPanelCtrl.__proto__ || Object.getPrototypeOf(D3BulletPanelCtrl)).call(this, $scope, $injector));

    _lodash2.default.defaults(_this.panel, panelDefaults);
    _this.panel.bulletDivId = 'd3bullet_svg_' + _this.panel.id;
    _this.containerDivId = 'container_' + _this.panel.bulletDivId;
    _this.scoperef = $scope;
    _this.alertSrvRef = alertSrv;
    _this.initialized = false;
    _this.panelContainer = null;
    _this.panel.svgContainer = null;
    _this.svg = null;
    _this.panelWidth = null;
    _this.panelHeight = null;
    _this.bulletObject = null;
    _this.bulletsData = [];
    _this.data = {
      value: 0,
      valueFormatted: 0,
      valueRounded: 0
    };
    _this.series = [];
    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
    //this.events.on('render', this.onRender.bind(this));
    _this.events.on('data-received', _this.onDataReceived.bind(_this));
    _this.events.on('data-error', _this.onDataError.bind(_this));
    _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
    return _this;
  }

  _createClass(D3BulletPanelCtrl, [{
    key: 'onInitEditMode',
    value: function onInitEditMode() {
      // determine the path to this plugin
      var panels = grafanaBootData.settings.panels;
      var thisPanel = panels[this.pluginId];
      var thisPanelPath = thisPanel.baseUrl + '/';
      //add the relative path to the partial
      var optionsPath = thisPanelPath + 'partials/editor.options.html';
      this.addEditorTab('Options', optionsPath, 2);
      // var radialMetricsPath = thisPanelPath + 'partials/editor.radialmetrics.html';
      // this.addEditorTab('Radial Metrics', radialMetricsPath, 3);
      // var thresholdingPath = thisPanelPath + 'partials/editor.thresholding.html';
      // this.addEditorTab('Thresholding', thresholdingPath, 4);
      // var mappingsPath = thisPanelPath + 'partials/editor.mappings.html';
      // this.addEditorTab('Value Mappings', mappingsPath, 5);
    }

    /**
     * [setContainer description]
     * @param {[type]} container [description]
     */

  }, {
    key: 'setContainer',
    value: function setContainer(container) {
      this.panelContainer = container;
      this.panel.svgContainer = container;
    }

    // determine the width of a panel by the span and viewport

  }, {
    key: 'getPanelWidthBySpan',
    value: function getPanelWidthBySpan() {
      var trueWidth = 0;
      if (typeof this.panel.span === 'undefined') {
        // get the width based on the scaled container (v5 needs this)
        trueWidth = this.panelContainer.offsetParent.clientWidth;
      } else {
        // v4 and previous used fixed spans
        var viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        // get the pixels of a span
        var pixelsPerSpan = viewPortWidth / 12;
        // multiply num spans by pixelsPerSpan
        trueWidth = Math.round(this.panel.span * pixelsPerSpan);
      }
      return trueWidth;
    }
  }, {
    key: 'getPanelHeight',
    value: function getPanelHeight() {
      // panel can have a fixed height set via "General" tab in panel editor
      var tmpPanelHeight = this.panel.height;
      if (typeof tmpPanelHeight === 'undefined' || tmpPanelHeight === "") {
        // grafana also supplies the height, try to use that if the panel does not have a height
        tmpPanelHeight = String(this.height);
        // v4 and earlier define this height, detect span for pre-v5
        if (typeof this.panel.span != 'undefined') {
          // if there is no header, adjust height to use all space available
          var panelTitleOffset = 20;
          if (this.panel.title !== "") {
            panelTitleOffset = 42;
          }
          tmpPanelHeight = String(this.containerHeight - panelTitleOffset); // offset for header
        }
        if (typeof tmpPanelHeight === 'undefined') {
          // height still cannot be determined, get it from the row instead
          tmpPanelHeight = this.row.height;
          if (typeof tmpPanelHeight === 'undefined') {
            // last resort - default to 250px (this should never happen)
            tmpPanelHeight = "250";
          }
        }
      }
      // replace px
      tmpPanelHeight = tmpPanelHeight.replace("px", "");
      // convert to numeric value
      var actualHeight = parseInt(tmpPanelHeight);
      return actualHeight;
    }
  }, {
    key: 'clearSVG',
    value: function clearSVG() {
      if ((0, _jquery2.default)('#' + this.panel.bulletDivId).length) {
        //console.log("Clearing SVG id: " + this.panel.bulletDivId);
        (0, _jquery2.default)('#' + this.panel.bulletDivId).remove();
      }
    }
  }, {
    key: 'renderBullet',
    value: function renderBullet() {
      // update the values to be sent to the bullet constructor
      if ((0, _jquery2.default)('#' + this.panel.bulletDivId).length) {
        (0, _jquery2.default)('#' + this.panel.bulletDivId).remove();
      }
      (0, _jquery2.default)('.bullet').remove();
      this.panelWidth = this.getPanelWidthBySpan();
      this.panelHeight = this.getPanelHeight();
      console.log(this.panelWidth);
      console.log(this.panelHeight);
      var data = this.bulletsData;
      var margin = { top: 10, right: 40, bottom: 40, left: 120 };
      var width = this.panelWidth - margin.left - margin.right;
      var height = this.panelHeight / data.length - margin.top - margin.bottom;
      // set the width and height to be double the radius

      if (this.panel.bullet.rangesColor.length === 0) {
        this.rangeColChange();
      }
      if (this.panel.bullet.measuresColor.length === 0) {
        this.measureColChange();
      }
      var chart = d3.bullet().width(width).height(height).options(this.panel.bullet);

      this.svg = d3.select("#" + this.containerDivId).selectAll("svg").data(data).enter().append("svg").attr("class", "bullet").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")").call(chart);

      var title = this.svg.append("g").style("text-anchor", "end").attr("transform", "translate(-6," + height / 2 + ")");

      title.append("text").attr("class", "title").attr("font-family", this.panel.bullet.titleFont).attr("font-size", this.panel.bullet.titleFontSize + "px").attr("fill", this.panel.bullet.titleCol).text(function (d) {
        return d.title;
      });

      title.append("text").attr("class", "subtitle").attr("font-family", this.panel.bullet.subtitleFont).attr("font-size", this.panel.bullet.subtitleFontSize + "px").attr("fill", this.panel.bullet.subtitleCol).attr("dy", "1em").text(function (d) {
        return d.subtitle;
      });

      d3.selectAll("button").on("click", function () {
        this.svg.datum(randomize).call(chart.duration(1000)); // TODO automatic transition
      });
    }
  }, {
    key: 'randomize',
    value: function randomize(d) {
      if (!d.randomizer) d.randomizer = randomizer(d);
      d.ranges = d.ranges.map(d.randomizer);
      d.markers = d.markers.map(d.randomizer);
      d.measures = d.measures.map(d.randomizer);
      return d;
    }
  }, {
    key: 'randomizer',
    value: function randomizer(d) {
      var k = d3.max(d.ranges) * 0.2;
      return function (d) {
        return Math.max(0, d + k * (Math.random() - 0.5));
      };
    }
  }, {
    key: 'getRandomColor',
    value: function getRandomColor(color) {
      var p = 1,
          temp,
          random = Math.random(),
          result = '#';
      while (p < color.length) {
        temp = parseInt(color.slice(p, p += 2), 16);
        temp += Math.floor((255 - temp) * random);
        result += temp.toString(16).padStart(2, '0');
      }
      return result;
    }
  }, {
    key: 'rangeColChange',
    value: function rangeColChange() {
      var rangesColor = [];
      var color = this.panel.bullet.rangeCol;
      for (var i = 0; i < 30; i++) {
        rangesColor.push(this.getRandomColor(color));
      }
      if (this.panel.bullet.rangesColor.length > 0) {
        this.panel.bullet.rangesColor = rangesColor;
        this.render();
      } else {
        this.panel.bullet.rangesColor = rangesColor;
      }
    }
  }, {
    key: 'measureColChange',
    value: function measureColChange() {
      var color = this.panel.bullet.measureCol;
      var measuresColor = [];
      for (var i = 0; i < 30; i++) {
        measuresColor.push(this.getRandomColor(color));
      }
      if (this.panel.bullet.measuresColor.length > 0) {
        this.panel.bullet.measuresColor = measuresColor;
        this.render();
      } else {
        this.panel.bullet.measuresColor = measuresColor;
      }
    }
  }, {
    key: 'link',
    value: function link(scope, elem, attrs, ctrl) {
      //console.log("d3bullet inside link");
      var bulletByClass = elem.find('.grafana-d3-bullet');
      //bulletByClass.append('<center><div id="'+ctrl.containerDivId+'"></div></center>');
      bulletByClass.append('<div id="' + ctrl.containerDivId + '"></div>');
      var container = bulletByClass[0].childNodes[0];
      ctrl.setContainer(container);
      function render() {
        ctrl.renderBullet();
      }
      this.events.on('render', function () {
        render();
        ctrl.renderingCompleted();
      });
    }
  }, {
    key: 'getDecimalsForValue',
    value: function getDecimalsForValue(value) {
      if (_lodash2.default.isNumber(this.panel.decimals)) {
        return { decimals: this.panel.decimals, scaledDecimals: null };
      }

      var delta = value / 2;
      var dec = -Math.floor(Math.log(delta) / Math.LN10);

      var magn = Math.pow(10, -dec),
          norm = delta / magn,
          // norm is between 1.0 and 10.0
      size;

      if (norm < 1.5) {
        size = 1;
      } else if (norm < 3) {
        size = 2;
        // special case for 2.5, requires an extra decimal
        if (norm > 2.25) {
          size = 2.5;
          ++dec;
        }
      } else if (norm < 7.5) {
        size = 5;
      } else {
        size = 10;
      }

      size *= magn;

      // reduce starting decimals if not needed
      if (Math.floor(value) === value) {
        dec = 0;
      }

      var result = {};
      result.decimals = Math.max(0, dec);
      result.scaledDecimals = result.decimals - Math.floor(Math.log(size) / Math.LN10) + 2;
      return result;
    }
  }, {
    key: 'onDataError',
    value: function onDataError(err) {
      this.onDataReceived([]);
    }
  }, {
    key: 'parseSeries',
    value: function parseSeries(series) {
      return _lodash2.default.map(this.series, function (serie, i) {
        return {
          title: serie.alias,
          subtitle: serie.alias,
          ranges: [parseInt(serie.stats.min.toFixed(2)), parseInt(serie.stats.max.toFixed(2)) - parseInt(serie.stats.range.toFixed(2)) / 2, parseInt(serie.stats.max.toFixed(2))],
          measures: [parseInt(serie.stats.min.toFixed(2)) + parseInt(serie.stats.range.toFixed(2)) / 3, parseInt(serie.stats.min.toFixed(2)) + parseInt(serie.stats.range.toFixed(2)) / 3 * 2],
          markers: [parseInt(serie.stats.avg.toFixed(2))]
        };
      });
    }
  }, {
    key: 'onDataReceived',
    value: function onDataReceived(dataList) {
      this.series = dataList.map(this.seriesHandler.bind(this));
      var data = {};
      this.bulletsData = this.parseSeries(this.series);
      if (this.bulletObject !== null) {
        this.bulletObject.updateBullet(data.value, data.valueFormatted, data.valueRounded);
      } else {
        // render bullet
        this.render();
      }
    }
  }, {
    key: 'seriesHandler',
    value: function seriesHandler(seriesData) {
      var series = new _time_series2.default({
        datapoints: seriesData.datapoints,
        alias: seriesData.target
      });
      series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
      return series;
    }
  }]);

  return D3BulletPanelCtrl;
}(_sdk.MetricsPanelCtrl);

D3BulletPanelCtrl.templateUrl = 'partials/template.html';
exports.D3BulletPanelCtrl = D3BulletPanelCtrl;
exports.MetricsPanelCtrl = D3BulletPanelCtrl;
//# sourceMappingURL=ctrl.js.map
