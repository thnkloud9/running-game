    var fps            = 240;                      // how many 'update' frames per second
    var step           = 1/fps;                   // how long is each frame (in seconds)
    var centrifugal    = 0;                       // centrifugal force multiplier when going around curves
    var skySpeed       = 0;                       // background sky layer scroll speed when going around curve (or up hill)
    var hillSpeed      = 0;                       // background hill layer scroll speed when going around curve (or up hill)
    var treeSpeed      = 0;                       // background tree layer scroll speed when going around curve (or up hill)
    var skyOffset      = 0;                       // current sky scroll offset
    var hillOffset     = 0;                       // current hill scroll offset
    var treeOffset     = 0;                       // current tree scroll offset
    var segments       = [];                      // array of road segments
    var canvas         = Dom.get('canvas');       // our canvas...
    var ctx            = canvas.getContext('2d'); // ...and its drawing context
    var background     = null;                    // our background image (loaded below)
    var sprites        = null;                    // our spritesheet (loaded below)
    var hearts         = null;                    // our spritesheet (loaded below)
    var inHoleText     = Dom.get('inHoleText');   // something to show when in the hole
    var timesUp        = Dom.get('timesUp');      // something to show when the allotted time has elapsed
    var startCountEl   = Dom.get('countDown');    // countdown before game starts
    var resolution     = null;                    // scaling factor to provide resolution independence (computed)
    var roadWidth      = 775;                     // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
    var segmentLength  = 200;                     // length of a single segment
    var trackLength    = null;                    // z length of entire track (computed)
    var lanes          = 3;                       // number of lanes
    var fieldOfView    = 100;                     // angle (degrees) for field of view
    var cameraHeight   = 1000;                    // z height of camera
    var cameraDepth    = null;                    // z distance camera is from screen (computed)
    var drawDistance   = 80;                      // number of segments to draw
    var playerX        = 0;                       // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
    var playerAir      = 0;                       // player x offset from bottom of the screen 
    var playerZ        = null;                    // player relative z distance from camera (computed)
    var position       = 0;                       // current camera Z position (add playerZ to get player's absolute Z position)
    var speed          = 0;                       // current speed
    var maxSpeed       = segmentLength/step;      // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)

    var jumpSpeed      = 3;
    var duckSpeed      = 3;
    var turnSpeed      = 0.03;

    var defaultSpeed        = 2500;
    var defaultHandSpeed    = 2400;
    var chaserSpeed           = 2400;
    var bulletSpeed         = 10;

    // keys
    var keyLeft        = false;
    var keyRight       = false;

    // mouse and touch
    var swipeLeft      = false;
    var swipeRight     = false;
    var swipeUp        = false;
    var swipeDown      = false;
    var ignoreSwipes   = false;

    // player state
    var playerState    = 'running';
    var playerDest     = 0;
    var inHole = false;
    var showHand = false;
    var paused = true;
    var end = false;
    var stop = false;
    var shot = 0;
    var caught = false;
    var outOfTime = false;
    var currentLane = 0;
    var health = 100;
    var maxHealth = 100;
    var powerUp = false;
    var powerDown = false;

    var points = 0;
    var timer = 61;
    var countingDown = false;
    var skipFire = 0;
    var resetGame = false;
    var chasers = [];
    var totalChasers = 1;

    function escapeHole() {
      clearInterval(inHole);
      inHole = false;
      showHand = false;
      // clear hole text
      Dom.hide('inHoleText');
      stop = false;
      speed = defaultSpeed;
      playerState = "running";
      setTimeout(function() {
        ignoreSwipes = false;
      }, 1000);
    }

    function countDown() {
        if (!paused){
          timer = timer - 1;

          if (timer === 0) {
            if (practiseState === true) {
              pauseGame();
              restartGame();
            } else {
              outOfTime = true;
              Dom.hide('inHoleText');
              Dom.show('timesUp');
              gameOver('out of time');
            }
          }
        }

      if (!end) {
        // award 3 points ever second
        if (!paused){
          Dom.set('points_value', Math.abs(Dom.get('points_value').innerHTML) + 3);
        }
        $hand.setAttribute("style", '-webkit-transform:rotate(-' + ((timer - 1) * 6) +'deg);' + '-ms-transform:rotate(-' + ((timer - 1) * 6) +'deg);');
        $clock1.setAttribute("style", '-webkit-transform:rotate(-' + ((timer - 1) * 6) +'deg);' + '-ms-transform:rotate(-' + ((timer - 1) * 6) +'deg);');
        if (timer < 30) {
          $clock1.style.display = "none";
          $clock2.setAttribute("style", '-webkit-transform:rotate(-' + (((timer - 1) * 6) + 180) +'deg);' + '-ms-transform:rotate(-' + (((timer - 1) * 6) + 180) +'deg)');
        }
        if (timer < 1) {
          $clock2.style.display = "none";
        }
      }
    }

    // practise or play?
    var practiseState = false;

    function startGame() {
      Dom.hide('intro');
      Dom.show('tapToStart');
      startCountEl.innerHTML = null;
      var i = 3;
      function unPause() {
        Dom.hide('tapToStart');
        startCountEl.style.display = 'block';
        startCountEl.innerHTML = i;
        doCD = setInterval(function(){
          i = i - 1;
          startCountEl.innerHTML = i;
          if (i === 0) {
            clearInterval(doCD);
            doCD = false;
          }
        }, 1000);
        setTimeout(function(){
          startCountEl.style.display = 'none';
          paused = false;
        }, 3000);
        clearInterval(countingDown)
        countingDown = false;
        countingDown = setInterval(countDown, 1000);
      }
      Dom.on( 'tapToStart', 'click', unPause);
      Dom.on( 'tapToStart', 'touchstart', unPause);
      Dom.on( 'tapToStart', 'mousedown', unPause);
    }

    function startPGame() {
      practiseState = true;
      startGame();
    }

    function changePState(){
      practiseState = true;
    }

    function restartGame(){
      // practise state reset
      practiseState = false;
      inHole = false;
      Dom.hide('inHoleText');
      // set pause
      pause = true;
      // reset vars
      playerState = 'running';
      end = false;
      caught = false;
      playerDest = 0;
      shot = 0;
      var $lives = Dom.get("lives");
      $lives.childNodes[1].className = '';
      $lives.childNodes[0].className = '';
      points = 0;
      Dom.set('points_value', 0);
      clearInterval(doCD);
      doCD = false;
      clearInterval(countingDown);
      countingDown = false;
      timer = 61;
      // hide some stuff
      Dom.hide('practise');
      Dom.hide('score');
      // show some stuff
      Dom.show('intro');
      Dom.show($clock1);
      // rotate the clock elements back to true start
      $hand.setAttribute("style", '-webkit-transform:rotate(0deg); -ms-transform:rotate(0deg);');
      $clock1.setAttribute("style", '-webkit-transform:rotate(0deg); -ms-transform:rotate(0deg);');
      $clock2.setAttribute("style", '-webkit-transform:rotate(0deg); -ms-transform:rotate(0deg);');
      position = 0;
      playerX = 0;
      resetGame = true;
      resetRoad();
    }

    Dom.on( 'practise', 'click', startPGame);
    Dom.on( 'practise', 'touchstart', startPGame);
    Dom.on( 'practise', 'mousedown', startPGame);

    Dom.on( 'play', 'click', startGame);
    Dom.on( 'play', 'touchstart', startGame);
    Dom.on( 'play', 'mousedown', startGame);

    //=========================================================================
    // UPDATE THE GAME WORLD
    //=========================================================================

    function update(dt) {
      var n, sprite, spriteW;
      var playerSegment = findSegment(position+playerZ);
      var playerW       = 130 * SPRITES.SCALE;
      var speedPercent  = speed/maxSpeed;
      var dx            = dt * 2 * speedPercent; // at top speed, should be able to cross from left to right (-1 to 1) in 1 second
      var startPosition = position;

      if (resetGame) {
        playerX = 0;
        playerDest = 0;
        currentLane = 0;
        swipeUp = false;
        swipeDown = false;
        swipeLeft = false;
        swipeRight = false;
        dx = 0;
        speedPercent = 0;
        playerSegment.curve = 0;
        centrifugal = 0;
        resetGame = false;
      }

      if (!end) {

        position = Util.increase(position, dt * speed, trackLength);

        playerX = playerX - (dx * speedPercent * playerSegment.curve * centrifugal);
        
        // tap to exit hole
        if (inHole) {
          ignoreSwipes = true;
          Dom.on('canvas', 'touchstart', escapeHole);
          Dom.on('canvas', 'mousedown', escapeHole);
          Dom.on('canvas', 'click', escapeHole);
          Dom.on('inHoleText', 'touchstart', escapeHole);
          Dom.on('inHoleText', 'mousedown', escapeHole);
          Dom.on('inHoleText', 'click', escapeHole);
          if (swipeUp) {
            escapeHole();
          }
      } else {
          if (swipeUp) {
            swipeDown = false;
            swipeLeft = false;
            swipeRight = false;
            if ((playerState != "jumpup") && (playerState != "jumpdown")) {
              playerDest = 100;
              playerState = "jumpup";
            }

            if ((playerState == "jumpup") && (playerAir <= playerDest)) {
              if (playerAir == playerDest)
                playerState = "jumpdown";
              playerAir = playerAir + jumpSpeed;
            } else {
              playerAir = playerAir - jumpSpeed;
              playerState = "jumpdown";
            }

            if (playerAir === 0) {
              swipeUp = false;
              playerState = "running";
            }
          }

          if (swipeDown) {
            swipeUp = false;
            swipeLeft = false;
            swipeRight = false;
            if ((playerState != "duckdown") && (playerState != "duckup")) {
              playerDest = -Math.abs(60);
              playerState = "duckdown";
            }

            if ((playerState == "duckdown") && (playerAir >= playerDest)) {
              if (playerAir == playerDest)
                playerState = "duckup";
              playerAir = playerAir - duckSpeed;
            } else {
              playerAir = playerAir + duckSpeed;
              playerState = "duckup";
            }

            if (playerAir === 0) {
              swipeDown = false;
              playerState = "running";
            }
          }

          if (swipeLeft && !ignoreSwipes) {
            swipeRight = false;
            if (playerState != "left") {
              playerDest = playerX - 0.75;
              playerState = "left";
            }

            if (playerX > playerDest) {
              playerX = playerX - turnSpeed;
            } else {
              swipeLeft = false;
              currentLane--;
              playerState = "running";
            }
          }

          if (swipeRight && !ignoreSwipes) {
            stop = false;
            swipeLeft = false;
            if (playerState != "right") {
              playerDest = playerX + 0.75;
              playerState = "right";
            }

            if (playerX < playerDest) {
              playerX = playerX + turnSpeed;
            } else {
              swipeRight = false;
              currentLane++;
              playerState = "running";
            }
          }
        }

        // adjust if player was stopped before moving completely into his lane
        if (playerState == "running") {
          if (currentLane == 0) {
            playerX = 0;
          } else if (currentLane == 1) {
            playerX = 0.75;
          } else if (currentLane == -1) {
            playerX = -0.75;
          }
        }

        if (!paused) {
          // increase speed
          speed = speed + 5;
          defaultSpeed = defaultSpeed + 5;

          chaserSpeed = chaserSpeed + 1;
          defaultHandSpeed = defaultHandSpeed + 1;

          speed = defaultSpeed;
        } else {
          speed = 0;
        }

        if (stop) {
          speed = maxSpeed/5;
          position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength);
        }

        // off road obsticals 
        if ((playerX < -1) || (playerX > 1)) {

          for(n = 0 ; n < playerSegment.sprites.length ; n++) {
            sprite  = playerSegment.sprites[n];
            spriteW = sprite.source.w * SPRITES.SCALE;
            if (Util.overlap(playerX, playerW, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW)) {
              speed = maxSpeed/5;
              position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength);
              break;
            }
          }
        }

        // obstacles in road
        for(n = 0 ; n < playerSegment.sprites.length ; n++) {
          sprite  = playerSegment.sprites[n];
          if (typeof sprite.source.w == 'undefined') {
            spriteW = sprite.source[0].w * SPRITES.SCALE;
          } else { 
            spriteW = sprite.source.w * SPRITES.SCALE;
          }
          if (Util.overlap(playerX, playerW, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW, 0.8)) {

            // gate collision 
            if (sprite.source == SPRITES.GATE) {
              if ((playerState == "duckdown") || (playerState == "duckup")) {
                // add points or some shit
              } else {
                //stop
                speed = maxSpeed/5;
                position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength);
                if ((playerState === "running") || (playerState == "hit"))
                  playerState = "hit";
                  health = health - .3;
              }
            }

            if (sprite.source == SPRITES.HOLE) {
              if ((playerState == "jumpup") || (playerState == "jumpdown")) {
                // skip the hole
                clearInterval(inHole);
                // clear hole background
                inHole = false;
                showHand = false;
              } else {
                if (!inHole) {
                  // whatever you want to do when you leave the hole
                  Dom.hide('inHoleText');
                } else {
                  // whatever you want to do in the hole
                  stop = true;
                }
              }
            }

            // carrot collision 
            if (sprite.source == SPRITES.CARROT) {
              // add points 
              sprite.source = { x:  0, y:  0, w: 0, h: 0 };
              Dom.set('points_value', Math.abs(Dom.get('points_value').innerHTML) + 1);
              health = Math.min((health + 1), maxHealth);
            }

            // gold carrot collision 
            if (sprite.source == SPRITES.GOLD_CARROT) {
              // add points 
              sprite.source = { x:  0, y:  0, w: 0, h: 0 };
              Dom.set('points_value', Math.abs(Dom.get('points_value').innerHTML) + 5);
              health = Math.min((health + 1), maxHealth);

              powerUp = true;
              setTimeout(function() {
                powerUp = false;
              }, 3000);

            }

            // stump collision
            if (sprite.source == SPRITES.STUMP) {
              if ((playerState === "jumpdown") || (playerState === "jumpup")) {
                // add points or some shit
              } else {
                //stop
                speed = maxSpeed/5;
                position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength);
                if ((playerState === "running") || (playerState == "hit"))
                  playerState = "hit";
                  health = health - .3;
              }
            }
            break;
          }
        }

        playerX = Util.limit(playerX, -'.75', '.75');     // dont ever let it go too far out of bounds
        if (powerUp) {
          speed = maxSpeed;
        } else if (powerDown) {
          speed = 1000;
          health = health - .10; 
        } else {
          speed = Util.limit(speed, 0, (maxSpeed / 2)); // or exceed half maxSpeed
        }
        Dom.set('speed_value', speed);
        Dom.set('health_value', health);
        Dom.valueSet('health_value', health);

        if (health < 1) {
          caught = true;
          gameOver('caught');
        }
      }
    }

    //-------------------------------------------------------------------------

    function formatTime(dt) {
      var minutes = Math.floor(dt/60);
      var seconds = Math.floor(dt - (minutes * 60));
      var tenths  = Math.floor(10 * (dt - Math.floor(dt)));
      if (minutes > 0)
        return minutes + "." + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
      else
        return seconds + "." + tenths;
    }

    //=========================================================================
    // RENDER THE GAME WORLD
    //=========================================================================

    function render() {
      var baseSegment   = findSegment(position);
      var basePercent   = Util.percentRemaining(position, segmentLength);
      var playerSegment = findSegment(position+playerZ);
      var playerPercent = Util.percentRemaining(position+playerZ, segmentLength);
      var playerY       = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
      var maxy          = height;
      var x  = 0;
      var dx = - (baseSegment.curve * basePercent);

      ctx.clearRect(0, 0, width, height);

      Render.background(ctx, background, width, height, BACKGROUND.SKY,   skyOffset,  resolution * skySpeed  * playerY);

      var n, i, segment, sprite, spriteScale, spriteX, spriteY;

      for(n = 0 ; n < drawDistance ; n++) {

        segment        = segments[(baseSegment.index + n) % segments.length];
        segment.looped = segment.index < baseSegment.index;
        segment.clip   = maxy;

        Util.project(segment.p1, (playerX * roadWidth) - x,      playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
        Util.project(segment.p2, (playerX * roadWidth) - x - dx, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);

        x  = x + dx;
        dx = dx + segment.curve;

        if ((segment.p1.camera.z <= cameraDepth)         || // behind us
            (segment.p2.screen.y >= segment.p1.screen.y) || // back face cull
            (segment.p2.screen.y >= maxy))                  // clip by (already rendered) hill
          continue;

        Render.segment(ctx, width, lanes,
                       segment.p1.screen.x,
                       segment.p1.screen.y,
                       segment.p1.screen.w,
                       segment.p2.screen.x,
                       segment.p2.screen.y,
                       segment.p2.screen.w,
                       segment.color);

        maxy = segment.p1.screen.y;
      }

      for(n = (drawDistance-1) ; n > 0 ; n--) {
        segment = segments[(baseSegment.index + n) % segments.length];

        // render standard scale sprites
        for(i = 0 ; i < segment.sprites.length ; i++) {
          sprite      = segment.sprites[i];
          spriteScale = segment.p1.screen.scale;
          spriteX     = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * width/2);
          spriteY     = segment.p1.screen.y;

          if ((sprite.source != SPRITES.HAND) &&
              (!inHole) &&
              (sprite.source != SPRITES.FARMER)) {
            Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite.source, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip);
          }
        }

        if (segment == playerSegment) {
          Render.player(ctx, width, height, resolution, roadWidth, sprites, speed/maxSpeed,
                        cameraDepth/playerZ,
                        width/2,
                        (height/2) - (cameraDepth/playerZ * Util.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height/2) - playerAir,
                        speed * (keyLeft ? -1 : keyRight ? 1 : 0),
                        playerSegment.p2.world.y - playerSegment.p1.world.y,
                        playerState);
        }
      }

      // hole sprites must cover every other sprite except chaser
      if (inHole) {
        // draw hearts on black background
        Render.polygon(ctx, 0, 0, 0, height, width, height, width, 0, COLORS.BLACK);
        Render.hearts(ctx, hearts, SPRITES.HEARTS);
        Dom.show('inHoleText');
      }

    }

    function findSegment(z) {
      return segments[Math.floor(z/segmentLength) % segments.length];
    }

    //=========================================================================
    // BUILD ROAD GEOMETRY
    //=========================================================================

    function lastY() { return (segments.length === 0) ? 0 : segments[segments.length-1].p2.world.y; }

    function addSegment(curve, y) {
      var n = segments.length;
      segments.push({
          index: n,
             p1: { world: { y: lastY(), z:  n   *segmentLength }, camera: {}, screen: {} },
             p2: { world: { y: y,       z: (n+1)*segmentLength }, camera: {}, screen: {} },
          curve: curve,
        sprites: [],
          chasers: [],
          color: COLORS.DEFAULT
      });
    }

    function addSprite(n, sprite, offset) {
      segments[n].sprites.push({ source: sprite, offset: offset });
    }

    function addRoad(enter, hold, leave, curve, y) {
      var startY   = lastY();
      var endY     = startY + (Util.toInt(y, 0) * segmentLength);
      var n, total = enter + hold + leave;
      for(n = 0 ; n < enter ; n++)
        addSegment(Util.easeIn(0, curve, n/enter), Util.easeInOut(startY, endY, n/total));
      for(n = 0 ; n < hold  ; n++)
        addSegment(curve, Util.easeInOut(startY, endY, (enter+n)/total));
      for(n = 0 ; n < leave ; n++)
        addSegment(Util.easeInOut(curve, 0, n/leave), Util.easeInOut(startY, endY, (enter+hold+n)/total));
    }

    var ROAD = {
      LENGTH: { NONE: 0, SHORT:  25, MEDIUM:   50, LONG:  100 },
      HILL:   { NONE: 0, LOW:    20, MEDIUM:   40, HIGH:   60 },
      CURVE:  { NONE: 0, EASY:    2, MEDIUM:    4, HARD:    6 }
    };

    function addStraight(num) {
      num = num || ROAD.LENGTH.MEDIUM;
      addRoad(num, num, num, 0, 0);
    }

    function addCurve(num, curve, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      curve  = curve  || ROAD.CURVE.MEDIUM;
      height = height || ROAD.HILL.NONE;
      addRoad(num, num, num, curve, height);
    }

    function addSCurves() {
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.NONE);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.MEDIUM,  ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.EASY,   -ROAD.HILL.LOW);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
    }

    function addHill(num, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      height = height || ROAD.HILL.MEDIUM;
      addRoad(num, num, num, 0, height);
    }

    function addLowRollingHills(num, height) {
      num    = num    || ROAD.LENGTH.SHORT;
      height = height || ROAD.HILL.LOW;
      addRoad(num, num, num,  0,                height/2);
      addRoad(num, num, num,  0,               -height);
      addRoad(num, num, num,  ROAD.CURVE.EASY,  height);
      addRoad(num, num, num,  0,                0);
      addRoad(num, num, num, -ROAD.CURVE.EASY,  height/2);
      addRoad(num, num, num,  0,                0);
    }

    function resetRoad() {
      segments = [];

      addStraight(ROAD.LENGTH.SHORT);
      addCurve(ROAD.CURVE.HARD, ROAD.CURVE.HARD, ROAD.CURVE.HARD);
      addSCurves();
      addStraight();
      addHill();
      addStraight();
      addLowRollingHills();
      addCurve();
      addStraight();
      addHill();
      addStraight();
      addLowRollingHills();
      addLowRollingHills();
      addCurve();
      addStraight();
      addHill();
      addStraight();
      addLowRollingHills();

      resetSprites();
      resetChasers();

      segments[findSegment(playerZ).index + 2].color = COLORS.START;
      segments[findSegment(playerZ).index + 3].color = COLORS.START;

      trackLength = segments.length * segmentLength;
    }

    function resetSprites() {
      var n;

      for(n = 10 ; n < segments.length-5; n += 2 ) {
        addSprite(n, SPRITES.FENCE_RIGHT, 1.8);
        addSprite(n, SPRITES.FENCE_LEFT, -1.8);
      }

      // add gates and stumps
      for(n = 30 ; n < segments.length ; n += 60) {
        addSprite(n,
            //Util.randomChoice([SPRITES.GATE, SPRITES.STUMP, SPRITES.HOLE]),
            Util.randomChoice([SPRITES.GATE, SPRITES.STUMP]),
            Util.randomChoice([-0.75,0.0,0.75])
        );
      }

      // add golden carrots (power ups)
      for(n = 30 ; n < segments.length ; n += 400) {
        addSprite(n, SPRITES.GOLD_CARROT, Util.randomChoice([-0.75,0.0,0.75]));
      }

      // add carrots
      var shift = 0;
      var position = 0;
      for(n = 30 ; n < segments.length ; n += 2) {
        shift++;
        if (shift === 10) {
          position = Util.randomChoice([-0.75,0.0,0.75]);
          shift = 0;
        }

        addSprite((n - 6),
            //Util.randomChoice([SPRITES.CARROT, SPRITES.CARROT, SPRITES.GOLD_CARROT]),
            Util.randomChoice([SPRITES.CARROT, SPRITES.CARROT]),
            position
        );
      }

    }

    function resetChasers() {
      chasers = [];
      var chaser, segment, offset, z, sprite, speed;
      for (n = 0 ; n < totalChasers ; n++) {
        offset = 0.75;
        //z      = Math.floor(Math.random() * segments.length) * segmentLength;
        z      = segments.length;
        sprite = SPRITES.HAND;
        speed  = chaserSpeed;
        chaser = { offset: offset, z: z, sprite: sprite, speed: speed };
        segment = segments[segments.length - 1];
        segment.chasers.push(chaser);
        chasers.push(chaser);
      }
    }

    //=========================================================================
    // THE GAME LOOP
    //=========================================================================

    Game.run({
      canvas: canvas, render: render, update: update, step: step,
      images: ["background", "sprites", "hearts"],
      keys: [
        { keys: [KEY.LEFT,  KEY.A], mode: 'down', action: function() { swipeRight = false; swipeLeft   = true;  } },
        { keys: [KEY.RIGHT, KEY.D], mode: 'down', action: function() { swipeLeft = false; swipeRight  = true;  } },
        { keys: [KEY.UP,    KEY.W], mode: 'down', action: function() { swipeDown = false; swipeUp = true; } },
        { keys: [KEY.DOWN,  KEY.S], mode: 'down', action: function() { swipeUp = false; swipeDown = true; } }
      ],
      swipes: [
        { direction: 'up', action: function() { swipeUp = true; swipeDown = false; } },
        { direction: 'down', action: function() { swipeDown = true; swipeUp = false; } },
        { direction: 'left', action: function() { swipeLeft = true; swipeRight = false; } },
        { direction: 'right', action: function() { swipeRight = true; swipeLeft = false; } }
      ],
      ready: function(images) {
        background = images[0];
        sprites    = images[1];
        hearts     = images[2];
        reset();
      }
    });

    function reset(options) {
      options       = options || {};
      canvas.width  = width  = Util.toInt(options.width,          width);
      canvas.height = height = Util.toInt(options.height,         height);
      lanes                  = Util.toInt(options.lanes,          lanes);
      roadWidth              = Util.toInt(options.roadWidth,      roadWidth);
      cameraHeight           = Util.toInt(options.cameraHeight,   cameraHeight);
      drawDistance           = Util.toInt(options.drawDistance,   drawDistance);
      fieldOfView            = Util.toInt(options.fieldOfView,    fieldOfView);
      segmentLength          = Util.toInt(options.segmentLength,  segmentLength);
      cameraDepth            = 1 / Math.tan((fieldOfView/2) * Math.PI/180);
      playerZ                = (cameraHeight * cameraDepth);
      resolution             = height/480;

      if ((segments.length === 0) || (options.segmentLength))
        resetRoad(); // only rebuild road when necessary
    }

    function pauseGame() {
      speed = 0;
      paused = true;
      clearInterval(countingDown);
      countingDown = false;
    }

    function gameOver(message) {
      end = true;
      clearInterval(countingDown);
      countingDown = false;
      clearInterval(inHole);
      inHole = false;
      Dom.hide('inHoleText');

      // only run once
      if (!paused) {
        pauseGame();
        if (!practiseState) {
          setTimeout(function() {
            Dom.hide('timesUp');
            Dom.show('score');
            // catch if the game was ended in a hole
            // count up score
            points = Math.abs(Dom.get('points_value').innerHTML);
            for (n=0;n<points;n++) {
              setTimeout(function() {
                Dom.set('preScore', Math.abs(Math.abs(Dom.get('preScore').innerHTML) + 1));
              }, 500);
            }
            // set post score
            setTimeout(function() {
              Dom.set('postScore', Math.abs(points * 1));
            }, 2000);
          }, 4000);
        } else {
          setTimeout(function(){
            restartGame();
          }, 3000);
        }
      }
      return false;
    }

    //=========================================================================
    // TWEAK UI HANDLERS
    //=========================================================================

    //=========================================================================
    var $hand = Dom.get("hand");
    var $timer = Dom.get("remaining_time");
    var $clock1 = Dom.get("clock-1");
    var $clock2 = Dom.get("clock-2");

    // score screen stuff
    var $preScore         = Dom.get("preScore");
    var $multiScore       = Dom.get("multiScore");
    var $postScore        = Dom.get("postScore");
    var $multiplierTitle  = Dom.get("multiplier-title");
    var $multiplierScore  = Dom.get("multiplier-score");
