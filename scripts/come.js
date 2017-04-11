registerPlugin({
 name: '!come',
 version: '1.1',
 description: 'Implements the !come and !goaway command.',
 author: 'Xuxe <julian@julian-huebenthal.de>',
    vars: {

	  	  ids: {
		    title: 'Client Unique Ids (Comma seperated):',
		    type: 'string'
		  },
		
		   cid: {
			   title: 'Default Channel ID (Needed for !goaway): ',
			   type: 'channel'
		   },
	   
		   sids: {
			   title: 'Whitelisted Servergroup Ids (Comma seperated):',
		   	   type: 'string'
		   }
	}

},	function (sinusbot, config)	{
					
		 
            if (config.sids) {
			
				var sids = config.sids.split(',');

		   } else { 

				log("SIDs not valid...");
				var sids = new Array();
		   }

		   if (config.ids) {
				
				var uids = config.ids.split(',');
		    } else {
				log("UIDs not valid...");
				var uids = new Array();
		    }

		   
		   
		   
		   
		   sinusbot.on('chat', function(ev) {
						
					
					
						var IsInServerGroup = ev.clientServerGroups.some(function(group) 
						{
								
								if(sids.indexOf(group.i.toString()) >= 0)
								{
									return true;

								} else { return false; }


						});

							

						if(uids.indexOf(ev.clientUid) >= 0 || IsInServerGroup == true)
						{
			
								switch(ev.msg)
								{
									case "!come":
									
									


												var channel, client;
												var channels = sinusbot.getChannels();
											
												for (var i = 0; i < channels.length; i++) {

												if (!channels[i].clients) continue;
												channel = channels[i];
												for (var x = 0; x < channel.clients.length; x++) {
													client = channel.clients[x];
													if (client.id == ev.clientId)
													{
														sinusbot.join(channel.id);
														sinusbot.log("Going to client: "+ev.clientNick);
													}
										 
												}
												}
										

										  
										  
										  
									break;
									
									case "!goaway":
									
												if(!config.cid) {
				
													sinusbot.log('Default channel is not set. Command !goaway not available.');
													return;
												}
												
												sinusbot.join(config.cid);
												sinusbot.log("Going back to my default channel.");
									break;
								}
				
						}
	
			
		});


});