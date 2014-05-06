//=========================================================================
// minimalist DOM helpers
//=========================================================================

var Dom = {

  get:  function(id)                     { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); },
  set:  function(id, html)               { Dom.get(id).innerHTML = html;                        },
  on:   function(ele, type, fn, capture) { Dom.get(ele).addEventListener(type, fn, capture);    },
  un:   function(ele, type, fn, capture) { Dom.get(ele).removeEventListener(type, fn, capture); },
  show: function(ele, type)              { Dom.get(ele).style.display = (type || 'block');      },
  hide: function(ele, type)              { Dom.get(ele).style.display = (type || 'none');      },
  blur: function(ev)                     { ev.target.blur();                                    },

  addClassName:    function(ele, name)     { Dom.toggleClassName(ele, name, true);  },
  removeClassName: function(ele, name)     { Dom.toggleClassName(ele, name, false); },
  toggleClassName: function(ele, name, on) {
    ele = Dom.get(ele);
    var classes = ele.className.split(' ');
    var n = classes.indexOf(name);
    on = (typeof on == 'undefined') ? (n < 0) : on;
    if (on && (n < 0))
      classes.push(name);
    else if (!on && (n >= 0))
      classes.splice(n, 1);
    ele.className = classes.join(' ');
  },

  storage: window.localStorage || {}

};

//=========================================================================
// general purpose helpers (mostly math)
//=========================================================================

var Util = {

  timestamp:        function()                  { return new Date().getTime();                                    },
  toInt:            function(obj, def)          { if (obj !== null) { var x = parseInt(obj, 10); if (!isNaN(x)) return x; } return Util.toInt(def, 0); },
  toFloat:          function(obj, def)          { if (obj !== null) { var x = parseFloat(obj);   if (!isNaN(x)) return x; } return Util.toFloat(def, 0.0); },
  limit:            function(value, min, max)   { return Math.max(min, Math.min(value, max));                     },
  randomInt:        function(min, max)          { return Math.round(Util.interpolate(min, max, Math.random()));   },
  randomChoice:     function(options)           { return options[Util.randomInt(0, options.length-1)];            },
  percentRemaining: function(n, total)          { return (n%total)/total;                                         },
  accelerate:       function(v, accel, dt)      { return v + (accel * dt);                                        },
  interpolate:      function(a,b,percent)       { return a + (b-a)*percent;                                       },
  easeIn:           function(a,b,percent)       { return a + (b-a)*Math.pow(percent,2);                           },
  easeOut:          function(a,b,percent)       { return a + (b-a)*(1-Math.pow(1-percent,2));                     },
  easeInOut:        function(a,b,percent)       { return a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);        },
  exponentialFog:   function(distance, density) { return 1 / (Math.pow(Math.E, (distance * distance * density))); },

  increase:  function(start, increment, max) { // with looping
    var result = start + increment;
    while (result >= max)
      result -= max;
    while (result < 0)
      result += max;
    return result;
  },

  project: function(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x     = (p.world.x || 0) - cameraX;
    p.camera.y     = (p.world.y || 0) - cameraY;
    p.camera.z     = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth/p.camera.z;
    p.screen.x     = Math.round((width/2)  + (p.screen.scale * p.camera.x  * width/2));
    p.screen.y     = Math.round((height/2) - (p.screen.scale * p.camera.y  * height/2));
    p.screen.w     = Math.round(             (p.screen.scale * roadWidth   * width/2));
  },

  overlap: function(x1, w1, x2, w2, percent) {
    var half = (percent || 1)/2;
    var min1 = x1 - (w1*half);
    var max1 = x1 + (w1*half);
    var min2 = x2 - (w2*half);
    var max2 = x2 + (w2*half);
    return ! ((max1 < min2) || (min1 > max2));
  }

};

//=========================================================================
// POLYFILL for requestAnimationFrame
//=========================================================================

if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
                                 window.mozRequestAnimationFrame    ||
                                 window.oRequestAnimationFrame      ||
                                 window.msRequestAnimationFrame     ||
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 };
}

//=========================================================================
// GAME LOOP helpers
//=========================================================================

var Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop

  run: function(options) {

    Game.loadImages(options.images, function(images) {

      options.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble

      Game.setKeyListener(options.keys);

      Game.setSwipeListener(options.swipes);

      var canvas = options.canvas,    // canvas render target is provided by caller
          update = options.update,    // method to update game logic is provided by caller
          render = options.render,    // method to render the game is provided by caller
          step   = options.step,      // fixed frame step (1/fps) is specified by caller
          now    = null,
          last   = Util.timestamp(),
          dt     = 0,
          gdt    = 0;

      function frame() {
        now = Util.timestamp();
        dt  = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        gdt = gdt + dt;
        while (gdt > step) {
          gdt = gdt - step;
          update(step);
        }
        render();
        last = now;
        requestAnimationFrame(frame, canvas);
      }
      frame(); // lets get this party started
      //Game.playMusic();
    });
  },

  //---------------------------------------------------------------------------

  loadImages: function(names, callback) { // load multiple images and callback when ALL images have loaded
    var result = [];
    var count  = names.length;

    var onload = function() {
      if (--count === 0)
        callback(result);
    };

    for(var n = 0 ; n < names.length ; n++) {
      var name = names[n];
      result[n] = document.createElement('img');
      Dom.on(result[n], 'load', onload);
      result[n].src = "images/" + name + ".png";
    }
  },

  //---------------------------------------------------------------------------

  setSwipeListener: function(swipes) {
    var touch = {};
    var mouse = {};

    if (checkForTouch()) {
      if (document.body.addEventListener)
      {
        document.body.addEventListener('touchmove', touchMove, false);
        document.body.addEventListener('touchstart', touchStart, false);
        document.body.addEventListener('touchend', touchEnd, false);
        // MS is such a pain
        document.body.addEventListener('MSPointerMove', touchMove, false);
        document.body.addEventListener('MSPonterDown', touchStart, false);
        document.body.addEventListener('MSPointerUp', touchEnd, false);
      } else {
        window.addEventListener('touchmove', touchMove, false);
        window.addEventListener('touchstart', touchStart, false);
        window.addEventListener('touchend', touchEnd, false);
        // MS is such a pain
        window.body.addEventListener('MSPointerMove', touchMove, false);
        window.body.addEventListener('MSPonterDown', touchStart, false);
        window.body.addEventListener('MSPointerUp', touchEnd, false);
      }
    } else {
      window.addEventListener('mousedown', mouseDown, false);
      window.addEventListener('mouseup', mouseUp, false);
      // console.log("No touch capability.");
    }

    function checkForTouch() {
      var d = document.createElement("div");
      d.setAttribute("ontouchmove", "return;");
      return typeof d.ontouchmove == "function" ? true : false;
    }

    function handleTouch(event){
      var touches;
      if (event.touches && event.touches.length > 0) {
        touches = event.touches[0]
      } else  {
        if (event.targetTouches) {
          touches = event.targetTouches[0];
        } else {
          touches = event;
        }
      }
      return touches;
    }

    function touchStart(event) {
      var touches = handleTouch(event);
      touch.startx = touches.pageX;
      touch.starty = touches.pageY;
    }

    function touchMove(event) {
      event.preventDefault();
      var touches = handleTouch(event);
      touch.endx = touches.pageX;
      touch.endy = touches.pageY;
    }

    function touchEnd(event) {
      event.preventDefault();

      // detect swipe direction
      diffx = touch.startx - touch.endx;
      diffy = touch.starty - touch.endy;
      getDirection(diffx, diffy);
    }

    function mouseDown(event) {
      mouse.startx = event.offsetX;
      mouse.starty = event.offsetY;
    }

    function mouseUp(event) {
      mouse.endx = event.offsetX;
      mouse.endy = event.offsetY;

      // detect swipe direction
      diffx = mouse.startx - mouse.endx;
      diffy = mouse.starty - mouse.endy;
      getDirection(diffx, diffy);
    }

    function getDirection(diffx, diffy) {
      if (Math.abs(diffx) > Math.abs(diffy) && diffx > 0) {
        mapAction('left');
      } else if (Math.abs(diffx) > Math.abs(diffy) && diffx < 0) {
        mapAction('right');
      } else if (Math.abs(diffy) > Math.abs(diffx) && diffy > 0) {
        mapAction('up');
      } else if (Math.abs(diffy) > Math.abs(diffx) && diffy < 0) {
        mapAction('down');
      }

    }

    function mapAction(direction) {
      for(n = 0 ; n < swipes.length ; n++) {
        s = swipes[n];
        if (s.direction == direction) {
          s.action.call();
        }
      }
    }
  },

  //---------------------------------------------------------------------------

  setKeyListener: function(keys) {
    var onkey = function(keyCode, mode) {
      var n, k;
      for(n = 0 ; n < keys.length ; n++) {
        k = keys[n];
        k.mode = k.mode || 'up';
        if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
          if (k.mode == mode) {
            k.action.call();
          }
        }
      }
    };
    Dom.on(document, 'keydown', function(ev) { onkey(ev.keyCode, 'down'); } );
    Dom.on(document, 'keyup',   function(ev) { onkey(ev.keyCode, 'up');   } );
  },

  //---------------------------------------------------------------------------

  playMusic: function() {
    var music = Dom.get('music');
    music.loop = true;
    music.volume = 0.05; // shhhh! annoying music!
    music.muted = (Dom.storage.muted === "true");
    music.play();
    Dom.toggleClassName('mute', 'on', music.muted);
    Dom.on('mute', 'click', function() {
      Dom.storage.muted = music.muted = !music.muted;
      Dom.toggleClassName('mute', 'on', music.muted);
    });
  }

};

//=========================================================================
// canvas rendering helpers
//=========================================================================

var Render = {

  polygon: function(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  },

  //---------------------------------------------------------------------------

  segment: function(ctx, width, lanes, x1, y1, w1, x2, y2, w2, color) {

    var r1 = Render.rumbleWidth(w1, lanes),
        r2 = Render.rumbleWidth(w2, lanes),
        l1 = Render.laneMarkerWidth(w1, lanes),
        l2 = Render.laneMarkerWidth(w2, lanes),
        lanew1, lanew2, lanex1, lanex2, lane;

    ctx.fillStyle = color.grass;
    ctx.fillRect(0, y2, width, y1 - y2);

    Render.polygon(ctx, x1-w1-r1, y1, x1-w1, y1, x2-w2, y2, x2-w2-r2, y2, color.rumble);
    Render.polygon(ctx, x1+w1+r1, y1, x1+w1, y1, x2+w2, y2, x2+w2+r2, y2, color.rumble);
    Render.polygon(ctx, x1-w1,    y1, x1+w1, y1, x2+w2, y2, x2-w2,    y2, color.road);

  },

  //---------------------------------------------------------------------------

  background: function(ctx, background, width, height, layer, rotation, offset) {

    rotation = rotation || 0;
    offset   = offset   || 0;

    var imageW = layer.w/2;
    var imageH = layer.h;

    var sourceX = layer.x + Math.floor(layer.w * rotation);
    var sourceY = layer.y;
    var sourceW = Math.min(imageW, layer.x+layer.w-sourceX);
    var sourceH = imageH;

    var destX = 0;
    var destY = offset;
    var destW = Math.floor(width * (sourceW/imageW));
    var destH = height;

    ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
    if (sourceW < imageW)
      ctx.drawImage(background, layer.x, sourceY, imageW-sourceW, sourceH, destW-1, destY, width-destW, destH);
  },

  //---------------------------------------------------------------------------

  carrotFrame: 0,
  carrotFrameStep: 0,
  carrotFrameRate: 100,
  sprite: function(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {

    if (sprite === SPRITES.CARROT) {
      var frames = sprite.length;
      if (this.carrotFrame == this.carrotFrameRate) {
          this.carrotFrameStep++;
          if (this.carrotFrameStep == 4) {
              this.carrotFrameStep = 0;
          }
          this.carrotFrame = 0;
      } else {
          this.carrotFrame++;
      }
      sprite = SPRITES.CARROT[this.carrotFrameStep];
    }

    if (sprite === SPRITES.GOLD_CARROT) {
      var frames = sprite.length;
      if (this.carrotFrame == this.carrotFrameRate) {
          this.carrotFrameStep++;
          if (this.carrotFrameStep == 4) {
              this.carrotFrameStep = 0;
          }
          this.carrotFrame = 0;
      } else {
          this.carrotFrame++;
      }
      sprite = SPRITES.GOLD_CARROT[this.carrotFrameStep];
    }

    //  scale for projection AND relative to roadWidth (for tweakUI)
    var destW  = (sprite.w * scale * width/2) * (SPRITES.SCALE * roadWidth);
    var destH  = (sprite.h * scale * width/2) * (SPRITES.SCALE * roadWidth);

    destX = destX + (destW * (offsetX || 0));
    destY = destY + (destH * (offsetY || 0));

    var clipH = clipY ? Math.max(0, destY+destH-clipY) : 0;
    if (clipH < destH)
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h*clipH/destH), destX, destY, destW, destH - clipH);

  },

  farmer: function(ctx, sprites, sprite, scale) {
    var destW  = (sprite.w * 0.001 * width/2) * (SPRITES.SCALE * roadWidth);
    var destH  = (sprite.h * 0.001 * width/2) * (SPRITES.SCALE * roadWidth);
    var destY = ((height - destH) + 30);

    if (scale > 0.000050) {
      destX = (scale * 10000) - 150;
    } else {
      destX = (((scale * 100000) + 3) - 230);
    }

    if (destX > -Math.abs(200)) {
      destX = -70;
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, destX, destY, destW, destH);
      return true;
    } else {
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, destX, destY, destW, destH);
      return false;
    }

  },

  bulletFrame: 0,
  bulletFrameStep: 0,
  bulletFrameRate: 4,
  bulletStep: 0,
  bulletX: 60,
  bulletHit: false,
  bullet: function(ctx, sprites, sprite, speed, reset) {
    var frames = sprite.length;
    if (this.bulletFrame == this.bulletFrameRate) {
        this.bulletFrameStep++;
        if (this.bulletFrameStep == 4) {
            this.bulletFrameStep = 0;
        }
        this.bulletFrame = 0;
    } else {
        this.bulletFrame++;
    }
    this.bulletStep++;
    sprite = sprite[this.bulletFrameStep];
    var destW  = sprite.w;
    var destH  = sprite.h;
    var destY = (height - (210 * 0.001 * width/2) * (SPRITES.SCALE * roadWidth));
    // reset for next bullet animation
    if (reset) {
        this.bulletStep = 0;
        this.bulletX = 60;
        this.bulletHit = false;
        return false;
    }

    this.bulletX += speed;
    var destX = this.bulletX;
    // see if we hit the rabbit
    var hitStart = (Math.abs(width / 2) - 60);
    var hitEnd = (Math.abs(width / 2) + 60);

    if ((destX >= hitStart) && (destX <= hitEnd)) {
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, destX, destY, destW, destH);
      if (this.bulletHit) {
        return false;
      } else {
        this.bulletHit = true;
        return true;
      }
    } else {
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, destX, destY, destW, destH);
      return false;
    }

  },

  heartsFrame: 0,
  heartsFrameStep: 0,
  heartsFrameRate: 16,
  hearts: function(ctx, sprites, sprite) {

    var frames = sprite.length;
    if (this.heartsFrame == this.heartsFrameRate) {
        this.heartsFrameStep++;
        if (this.heartsFrameStep == 4) {
            this.heartsFrameStep = 0;
        }
        this.heartsFrame = 0;
    } else {
        this.heartsFrame++;
    }
    sprite = SPRITES.HEARTS[this.heartsFrameStep];
    var destX = 0;
    var destY = 0;
    var destW  = sprite.w;
    var destH  = sprite.h;

    ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, destX, destY, destW, destH);
  },

  handX: 0,
  handY: 0,
  hand: function(ctx, sprites, sprite, percent, caught) {
    var handW  = (sprite.w * 0.001 * width/2) * (SPRITES.SCALE * roadWidth)
    var handH  = (sprite.h * 0.001 * width/2) * (SPRITES.SCALE * roadWidth)
    var maxY = (height - handH);

    if (caught) {
      var minX = ((width/2) - (sprite.w/2));
      // load grab sprite
      // animate grabbing action
      handX = (handX - 7);
      handY = (handY + 1);
      if (handX < minX) {
        handX = minX;
        handY = (handY + 15);
      }
    } else {
      handY = (height - (handH * (percent / 100)));
      handX = ((width / 2) + (handW / 2));
    }

    if (handY < maxY)
      handY = maxY;

    ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, handX, handY, handW, handH);

  },

  //---------------------------------------------------------------------------

  playerFrame: 0,
  playerFrameStep: 0,
  playerFrameRate: 5,
  player: function(ctx, width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown, playerState) {

    var bounce = (1.5 * Math.random() * speedPercent * resolution) * Util.randomChoice([-1,1]);
    var sprite;
    if ((playerState == "jumpdown") || (playerState == "jumpup"))
      sprite = SPRITES.PLAYER_JUMPING[this.playerFrameStep];
    else if ((playerState == "duckdown") || (playerState == "duckup"))
      sprite = SPRITES.PLAYER_DUCKING[this.playerFrameStep];
    else if ((playerState == "hit"))
      sprite = SPRITES.PLAYER_HIT[this.playerFrameStep];
    else
      sprite = SPRITES.PLAYER_RUNNING[this.playerFrameStep];

    Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
    if (this.playerFrame == this.playerFrameRate) {
        this.playerFrameStep++;
        if (this.playerFrameStep == 4) {
            this.playerFrameStep = 0;
        }
        this.playerFrame = 0;
    } else {
        this.playerFrame++;
    }
  },

  //---------------------------------------------------------------------------

  rumbleWidth:     function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(6,  2*lanes); },
  laneMarkerWidth: function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(32, 8*lanes); }

};

//=============================================================================
// GAME CONSTANTS
//=============================================================================

var KEY = {
  LEFT:  37,
  UP:    38,
  RIGHT: 39,
  DOWN:  40,
  A:     65,
  D:     68,
  S:     83,
  W:     87
};

var COLORS = {
  SKY:  '#72D7EE',
  TREE: '#005108',
  FOG:  '#005108',
  BLACK: '#000000',
  DEFAULT:  { road: '#C2A366', grass: '#5ca10f', rumble: '#5ca10f' },
  START:  { road: '#C2A366',   grass: '#5ca10f',   rumble: '#5ca10f'                     },
  FINISH: { road: 'black',   grass: 'black',   rumble: 'black'                     }
};

var BACKGROUND = {
  SKY:   { x:   5, y: 5, w: 1280, h: 480 }
};


var SPRITES = {
  FENCE_LEFT:             { x:  0, y:  1052, w: 611, h: 653 },
  FENCE_RIGHT:            { x:  630, y:  1052, w: 611, h: 653 },
  GATE:                   { x:  0, y:  367, w: 248, h: 247 },
  FARMER:                 { x:  250, y:  367, w: 248, h: 247 },

  BULLET:                [{ x:  40, y:  270, w: 90, h: 90 },
                          { x:  135, y:  270, w: 110, h: 90 },
                          { x:  250, y:  270, w: 135, h: 90 },
                          { x:  40, y:  270, w: 90, h: 90 }],
  
  HEARTS:                [{ x:  0, y:  0, w: window.width, h: window.height },
                          { x:  0, y:  640, w: window.width, h: window.height },
                          { x:  0, y:  0, w: window.width, h: window.height },
                          { x:  0, y:  640, w: window.width, h: window.height }],

  CARROT:                [{ x:  1189, y:  308, w: 30, h: 152 },
                          { x:  1235, y:  318, w: 30, h: 162 },
                          { x:  1280, y:  328, w: 30, h: 172 },
                          { x:  1235, y:  318, w: 30, h: 162 }],

  GOLD_CARROT:           [{ x:  1321, y:  308, w: 58, h: 158 },
                          { x:  1382, y:  318, w: 58, h: 158 },
                          { x:  1443, y:  328, w: 58, h: 168 },
                          { x:  1382, y:  318, w: 58, h: 178 }],

  STUMP:                  { x:  999, y:  349, w: 168, h: 112 },
  HAND:                   { x:  0, y:  630, w: 350, h: 400 },
  HOLE:                   { x:  1000, y:  477, w: 185, h: 60 },

  PLAYER_DUCKING:        [{ x:  1103, y:  0, w:   130, h:   265 },
                          { x:  1238, y:  0, w:   130, h:   265 },
                          { x:  1376, y:  0, w:   130, h:   265 },
                          { x:  1515, y:  0, w:   130, h:   265 }],

  PLAYER_JUMPING:        [{ x:  552, y:  0, w:   130, h:   265 },
                          { x:  688, y:  0, w:   130, h:   265 },
                          { x:  836, y:  0, w:   130, h:   265 },
                          { x:  974, y:  0, w:   130, h:   265 }],

  PLAYER_RUNNING:        [{ x:  0, y:    0, w:   130, h:   265 },
                          { x:  139, y:  0, w:   130, h:   265 },
                          { x:  284, y:  0, w:   130, h:   265 },
                          { x:  422, y:  0, w:   130, h:   265 }],

  PLAYER_HIT:            [{ x:  1654, y: 92, w: 202, h: 176 },
                          { x:  1654, y: 92, w: 202, h: 176 },
                          { x:  1654, y: 92, w: 202, h: 176 },
                          { x:  1654, y: 92, w: 202, h: 176 }]
};

SPRITES.SCALE = 0.3 * (1/130); // the reference sprite width should be 1/3rd the (half-)roadWidth

