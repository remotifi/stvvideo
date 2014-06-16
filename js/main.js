var 
	Session
		= (function()
	{
		var 
			messageHandlers
				= {},

			ws,

			// ...

			open
				= function(deviceConnectionUrl, supports)
			{
				var 
					supportsParam
						= '';

				// ...

				for (var i = 0; i < supports.length; i++)
				{
					supportsParam += supports[i];

					if (i !== supports.length - 1)
					{
						supportsParam += ',';
					}
				}

				// ...

				ws 
					= new WebSocket(deviceConnectionUrl + '&supports=' + supportsParam);

				// ...

				ws.onopen
					= function()
				{
					// ...
				};
				
				ws.onmessage
					= function(e)
				{
					var 
						message
							= JSON.parse(e.data);

					// ...

					if (messageHandlers[message.type])
					{
						messageHandlers[message.type](message.data);
					}
				};

				ws.onclose
					= function()
				{
					messageHandlers['session.close']();

					ws = null;
				};
			},

			send
				= function(messageObject)
			{
				if (ws)
				{
					ws.send(JSON.stringify(messageObject));
				}
			};

		// ...

		messageHandlers['session.close']
			= function()
		{	
			Video.stop();
		};

		messageHandlers['session.load']
			= function(data)
		{
			Video.load(data.mediaRef, data.startPosition);
		};

		messageHandlers['session.pause']
			= function()
		{
			Video.pause();
		};

		messageHandlers['session.resume']
			= function()
		{	
			Video.resume();
		};	

		messageHandlers['session.seek']
			= function(data)
		{
			Video.seek(data.position);
		};

		messageHandlers['session.stop']
			= function()
		{
			Video.stop();
		};

		// ...

		return {
			open: open,
			send: send
		};

	}()),

	Video
		= (function()
	{
		var 
			videoElement,

			loaded,

			duration,

			_relativeStartPosition,

			// ...

			mediaStatus
				= (function()
			{
				var 
					CHANGE_DELTA
						= 0.75,

					// ...

					changed
						= function(data)
					{
						var 
							args
								= Array.prototype.slice.call(arguments),

							argsObject	
								= {};

						for (var i = 0; i < args.length; i += 2)
						{
							argsObject[args[i]] = args[i + 1];
						}

						// ...

						Session.send(
							{
								type: 'session.mediaStatus',
								data: argsObject
							}
						)
					},

					// ...

					state,
					position,

					// ...

					transitionTo
						=
					{
						loading:
							function()
							{
								changed('state', 'loading');
							},

						playing:
							function()
							{
								changed('state', 'playing');
							},

						paused:
							function()
							{
								changed('state', 'paused');
							},

						idle:
							function(reason)
							{
								changed('state', 'idle', 'idleReason', reason);
							}
					};

				// ...

				return {
					state:
						function()
						{
							return state;
						},

					updateState:
						function(newState, data)
						{
							if (state !== newState)
							{
								transitionTo[newState](data);

								state = newState;
							}
						},

					updatePosition:
						function(pos)
						{
							if (pos)
							{
								position = pos;
							}
							else
							{
								(function()
								{
									var 
										currentPosition
											= videoElement.currentTime;
	
									// ...

									if (currentPosition - position > CHANGE_DELTA)
									{
										position = currentPosition;
										
										changed('position', position);
									}
								}());
							}
						}
				};

			}()),

			// ...

			onloadedmetadata
				= function()
			{
				duration 
					= videoElement.duration;
			},

			oncanplay
				= function()
			{
				videoElement.currentTime
					= _relativeStartPosition * duration;

				videoElement.play();
			},

			ontimeupdate
				= function()
			{
				mediaStatus.updatePosition();
			},

			onloadstart
				= function()
			{
				mediaStatus.updateState('loading');
			},

			onstalled
				= function()
			{
				if (mediaStatus.state() !== 'idle')
				{		
					mediaStatus.updateState('loading');
				}
			},

			onwaiting
				= function()
			{
				mediaStatus.updateState('loading');
			},

			onplaying
				= function()
			{
				mediaStatus.updateState('playing');
			},

			onpause
				= function()
			{
				mediaStatus.updateState('paused');
			},

			onseeked
				= function()
			{
				mediaStatus.updatePosition(videoElement.currentTime);
			},

			onended
				= function()
			{
				mediaStatus.updateState('idle', 'ended');
			},

			onerror
				= function()
			{
				videoElement.src = '';

				mediaStatus.updateState('idle', 'cancelled');
			},

			// ...

			load
				= function(mediaRef, relativeStartPosition)
			{
				if (!loaded)
				{
					videoElement.addEventListener('loadedmetadata', onloadedmetadata);
					videoElement.addEventListener('canplay', oncanplay);

					// position.

					videoElement.addEventListener('timeupdate', ontimeupdate);
					videoElement.addEventListener('seeked', onseeked);

					// state.

					videoElement.addEventListener('loadstart', onloadstart);
					videoElement.addEventListener('stalled', onstalled);
					videoElement.addEventListener('waiting', onwaiting);
					videoElement.addEventListener('playing', onplaying);
					videoElement.addEventListener('pause', onpause);
					videoElement.addEventListener('ended', onended);
				
					// ...

					videoElement.addEventListener('error', onerror);

					loaded = true;
				}
					
				// ...

				_relativeStartPosition
					= relativeStartPosition;

				videoElement.src 
					= mediaRef;
			},

			resume
				= function()
			{
				videoElement.play();
			},

			pause
				= function()
			{
				videoElement.pause();
			},

			seek
				= function(position)
			{
				videoElement.currentTime
					= position;
			},

			stop
				= function()
			{
				videoElement.removeEventListener('loadedmetadata', onloadedmetadata);
				videoElement.removeEventListener('canplay', oncanplay);

				// position.

				videoElement.removeEventListener('timeupdate', ontimeupdate);
				videoElement.removeEventListener('seeked', onseeked);

				// state.

				videoElement.removeEventListener('loadstart', onloadstart);
				videoElement.removeEventListener('stalled', onstalled);
				videoElement.removeEventListener('waiting', onwaiting);
				videoElement.removeEventListener('playing', onplaying);
				videoElement.removeEventListener('pause', onpause);
				videoElement.removeEventListener('ended', onended);

				// ...

				videoElement.removeEventListener('error', onerror);

				loaded = false;

				// ...

				videoElement.src = '';

				mediaStatus.updateState('idle', 'stopped');
			};

		// ...

		videoElement
			= $('video').get(0);

		// ...

		return {
			load:
				load,

			resume:
				resume,

			pause:
				pause,

			seek:
				seek,

			stop:
				stop
		};
	}());

// ...

$(
	function()
	{
		var 
			argumentString	
				= window.location.search.replace('?', ''),

			args,
			tokens,

			result
				= {};

		// ...

		// STV emulator bug: '/' added to end of argument list. 
		argumentString
			= argumentString.substr(0, argumentString.length - 1);

		// ...

		args
			= argumentString.split('&');

		for (var arg in args)
		{
			tokens = args[arg].split('=');

			result[tokens[0]] = tokens[1];
		}  

		// ...

		Session.open(decodeURIComponent(result['deviceConnectionUrl']), ['video']);
	}
);