define(function(require) {
  var _ = require('underscore');
  var React = require('react');
  var Movable = require('./movable');

  var DEFAULT_PROPS = {
    scale: 100
  };

  var AddImageButton = React.createClass({
    handleClick: function() {
      this.addImage(window.prompt("Gimme an image URL.",
                                  "http://placekitten.com/g/320/240"));
    },
    addImage: function(url, cb) {
      if (!url) return;
      if (!/^https?:\/\//.test(url))
        return window.alert("Invalid URL!");
      var img = document.createElement('img');

      cb = cb || function(err, newRef, img) {
        if (err)
          window.alert("Sorry, an error occurred loading the image.");
      }.bind(this);

      img.onload = this.handleImageLoad.bind(this, cb);
      img.onerror = cb;
      img.setAttribute('src', url);
      // TODO: Show some kind of throbber, etc.
    },
    scaleToFit: function(width, height) {
      var maxWidth = this.props.canvasWidth;
      var maxHeight = this.props.canvasHeight;

      if (width <= maxWidth && height <= maxHeight)
        return 100;
      if (width > height) {
        return Math.floor(maxWidth / width * 100);
      } else {
        return Math.floor(maxHeight / height * 100);
      }
    },
    handleImageLoad: function(cb, e) {
      var img = e.target;
      var scale = this.scaleToFit(img.naturalWidth, img.naturalHeight);
      var newRef = this.props.firebaseRef.push({
        type: 'image',
        props: _.extend({}, DEFAULT_PROPS, {
          url: img.src,
          height: img.naturalHeight,
          width: img.naturalWidth,
          scale: scale,
          x: 0,
          y: 0
        })
      });

      this.props.selectItem(newRef.key());
      cb(null, newRef, img);
    },
    render: function() {
      return (
        <button onClick={this.handleClick} style={{
          display: window.EMBEDDED_MODE ? 'none' : undefined
        }}>
          <i className="fa fa-image"></i>
        </button>
      );
    }
  });

  var ResizeHandle = React.createClass({
    CURSOR: 'nwse-resize',
    handleMouseDown: function(e) {
      var curtain = document.createElement('div');

      e.preventDefault();
      document.documentElement.appendChild(curtain);

      curtain.onmousemove = this.handleMouseMove;
      curtain.onmouseup = this.handleMouseUp;
      _.extend(curtain.style, {
        position: 'absolute',
        top: '0px',
        left: '0px',
        zIndex: '1000000',
        height: '100%',
        width: '100%',
        cursor: this.CURSOR
      });

      this.curtain = curtain;
      this.lastScreenX = e.screenX;
      this.lastScreenY = e.screenY;
    },
    handleMouseMove: function(e) {
      // Would prefer to use e.movementX, but it's not supported
      // by many browsers yet.
      var movementX = e.screenX - this.lastScreenX;
      var movementY = e.screenY - this.lastScreenY;
      this.lastScreenX = e.screenX;
      this.lastScreenY = e.screenY;
      this.props.onResize(movementX, movementY);
    },
    handleMouseUp: function(e) {
      e.preventDefault();
      this.removeCurtain();
    },
    removeCurtain: function() {
      if (!this.curtain) return;
      this.curtain.parentNode.removeChild(this.curtain);
      this.curtain = null;
    },
    componentWillUnmount: function() {
      this.removeCurtain();
    },
    render: function() {
      return <i className="fa fa-expand fa-flip-horizontal" style={{
        position: 'absolute',
        backgroundColor: 'yellow',
        color: 'black',
        cursor: this.CURSOR,
        padding: 4,
        right: 0,
        bottom: 0
      }} onMouseDown={this.handleMouseDown}/>;
    }
  });

  var MovableImageHolder = React.createClass({
    MINIMUM_SCALED_WIDTH: 32,
    mixins: [Movable.Nudging],
    handleResize: function(deltaX, deltaY) {
      var delta = deltaX + deltaY;
      var scaledDelta = delta * this.props.getPointerScale();
      var scale = this.props.scale / 100;
      var currWidth = Math.floor(this.props.width * scale);
      var newWidth = currWidth + scaledDelta;
      var newScale = newWidth / this.props.width;

      if (newWidth < this.MINIMUM_SCALED_WIDTH) return;

      this.props.firebaseRef.update({
        scale: newScale * 100
      });
    },
    render: function() {
      var scale = this.props.scale / 100;
      var width = Math.floor(this.props.width * scale);
      var height = Math.floor(this.props.height * scale);
      var image = React.createElement(MovableImage, this.props);

      if (!this.props.isEditable)
        return image;

      return (
        <div style={{
          position: 'absolute',
          top: this.props.y,
          left: this.props.x,
          width: width,
          height: height
        }}>
          {image}
          {this.props.isSelected
           ? <ResizeHandle onResize={this.handleResize} />
           : null}
        </div>
      );
    }
  });

  var MovableImage = React.createClass({
    mixins: [Movable],
    render: function() {
      var scale = this.props.scale / 100;
      var width = Math.floor(this.props.width * scale);
      var height = Math.floor(this.props.height * scale);
      var style = this.getMovingStyle();

      if (this.props.isEditable)
        style = _.pick(style, 'cursor');

      return <img style={style}
                  src={this.props.url}
                  width={width}
                  height={height}/>;
    }
  });

  return {
    DEFAULT_PROPS: DEFAULT_PROPS,
    AddButton: AddImageButton,
    ContentItem: MovableImageHolder,
    SelectionActions: []
  };
});
