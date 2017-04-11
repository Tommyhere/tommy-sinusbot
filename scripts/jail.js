registerPlugin({
    name: 'Jail',
    version: '1.1',
    description: 'This Plugin allows you to Jail People in a specific Channel! Usage help !jhelp',
    author: 'Multivitamin <david@multivitamin.ovh>',
    vars: {
        a_allowed_groups: {
            title: 'Comma Seperated List of Group IDs which are allowed to Jail Clients',
            type: 'string'
        },
        ab_protected_groups: {
            title: 'Comma Seperated List of Group IDs which are not able to get Jailed.',
            type: 'string'
        },
        b_jail_channel: {
            title: 'Channel to move jailed Clients',
            type: 'channel'
        },
        c_jail_on_record: {
            title: 'Jail Client if they start recording',
            type: 'select',
            options: [
				'yes',
                'no'
			]
        },
        d_jail_on_record_time: {
            title: 'Jail Time when User starts recording (0 = Permanent)',
            type: 'number'
        },
        e_jail_on_record_extension: {
            title: 'Time Modifier when User starts Recording',
            type: 'select',
            options: [
				'Seconds',
				'Minutes',
				'Hours',
				'Days',
				'Months'
			]
        }
        f_jail_message_intervall: {
            title: 'Message Intervall for Jailed Users',
            type: 'select',
            options: [
				'Off',
				'5 Seconds',
				'10 Seconds',
				'20 Seconds',
				'30 Seconds',
				'45 Seconds',
                '60 Seconds'
			]
        }
        
    }
}, function(sinusbot, config) {
    var jail_message_intervall_iteration = 0;
    var jail_message_intervall = [false, 1, 2, 4, 6, 9, 12];
    var timeconvert = {
        'second': 1,
        'seconds': 1,
        'minute': 60,
        'minutes': 60,
        'hour': 3600,
        'hours': 3600,
        'day': 86400,
        'days': 86400,
        'month': 2592000,
        'months': 2592000,
    };
    var timeconvert_helper = ['seconds', 'minutes', 'hours', 'days', 'months'];
    var pollInterval = setInterval(jailcheck, 5000);
    var release;
    var searcher = {};
    

    var nr = getNextRelease();
    if (nr !== false) {
        var timeout = nr[0] * 1000 - Date.now();
        var release = setTimeout(nextRelease, timeout);
    }
    
    sinusbot.on('chat', function(ev) {
        if (ev.clientId == sinusbot.getBotId()) return;
        if (ev.msg.startsWith('!help') || ev.msg.startsWith('!info')) {
            sinusbot.chatPrivate(ev.clientId, '[b]JAIL[/b] This Bot uses [URL=https://multivitamin.wtf]Multivitamins[/URL] Jail Plugin!');
            sinusbot.chatPrivate(ev.clientId, '[b]JAIL[/b] For Usage examples use !jhelp!');
        } else if (ev.msg.startsWith('!jhelp')) {
            sinusbot.chatPrivate(ev.clientId, '╔════════════════════════════════════════════════════════════════════════════════');
            sinusbot.chatPrivate(ev.clientId, '║[b]Jail Bot Usage:[/b]');
            sinusbot.chatPrivate(ev.clientId, '╠════════════════════════════════════════════════════════════════════════════════');
            sinusbot.chatPrivate(ev.clientId, '║[b]For Jailing a Client:');
            sinusbot.chatPrivate(ev.clientId, '║[b][color=#ea6153]!jail <EMPTY FOR Permanent|<time> <Seconds|Minutes|Hours|Days|Months>> <clienturl|uid|nickname part>');
            sinusbot.chatPrivate(ev.clientId, '║[b]PERMANENT Jail Example:');
            sinusbot.chatPrivate(ev.clientId, '║!jail [URL=client://0/abcdefghi/jklmnopq123456789a=~Some%20Cloent]Some Client[/URL]');
            sinusbot.chatPrivate(ev.clientId, '║!jail abcdefghi/jklmnopq123456789a=');
            sinusbot.chatPrivate(ev.clientId, '║!jail Some');
            sinusbot.chatPrivate(ev.clientId, '║[b]TEMPORARY Jail Example:');
            sinusbot.chatPrivate(ev.clientId, '║!jail 100 Seconds [URL=client://0/abcdefghi/jklmnopq123456789a=~Some%20Cloent]Some Client[/URL]');
            sinusbot.chatPrivate(ev.clientId, '║!jail 100 hours abcdefghi/jklmnopq123456789a=');
            sinusbot.chatPrivate(ev.clientId, '║!jail 1 day Some');
            sinusbot.chatPrivate(ev.clientId, '╠════════════════════════════════════════════════════════════════════════════════');
            sinusbot.chatPrivate(ev.clientId, '║For unjailing a Client:');
            sinusbot.chatPrivate(ev.clientId, '║[b][color=#ea6153]!unjail <clienturl|uid>');
            sinusbot.chatPrivate(ev.clientId, '║[b]Unjail Example:');
            sinusbot.chatPrivate(ev.clientId, '║!unjail [URL=client://0/abcdefghi/jklmnopq123456789a=~Some%20Cloent]Some Client[/URL]');
            sinusbot.chatPrivate(ev.clientId, '║!unjail abcdefghi/jklmnopq123456789a=');
            sinusbot.chatPrivate(ev.clientId, '╠════════════════════════════════════════════════════════════════════════════════');
            sinusbot.chatPrivate(ev.clientId, '║Getting a List of all Jailed Clients:');
            sinusbot.chatPrivate(ev.clientId, '║[b][color=#ea6153]!jlist');
            sinusbot.chatPrivate(ev.clientId, '╠════════════════════════════════════════════════════════════════════════════════');
            sinusbot.chatPrivate(ev.clientId, '║For the best experience add the Permission b_client_is_sticky and b_client_ignore_sticky with NEGATE to the Jail Channel!');
            sinusbot.chatPrivate(ev.clientId, '╚════════════════════════════════════════════════════════════════════════════════');
        } else if (ev.msg.startsWith('!jlist')) {
            var jail = sinusbot.getVar('jail');
            if(typeof(jail) === 'undefined') jail = {};
            if (ObjectLength(jail) > 0) {
                for (j in jail) {
                    if (jail[j].release == 0) {
                        var jailtime = ' Permanently!';
                    } else {
                        var jailtime = 'for ' + timeToString(jail[j].release - Math.floor(Date.now() / 1000)) + '!';
                    }
                    sinusbot.chatPrivate(ev.clientId, 'Client [URL=client://0/'+ j + '~' + encodeURIComponent(jail[j].nick) + ']' + jail[j].nick + '[/URL]  is jailed ' + jailtime);
                }
            } else {
                sinusbot.chatPrivate(ev.clientId, 'No Clients Jailed!');
            }
            return;
        } else if (ev.msg.startsWith('!jyes')) {
            if (!checkPerm(ev.clientServerGroups)) {
                sinusbot.chatPrivate(ev.clientId, 'You are not allowed to use Jail Commands!');
                return;
            }
            var search = getSearch(ev.clientUid);
            if (search === false) {
                sinusbot.chatPrivate(ev.clientId, 'No Search Process active!');
                return;
            }
            client = getClientByUid(search.selected.uid);
            if (!client) {
                var move = false;
                var client = search.selected;
            } else {
                var move = true;
            }
            if (search.type == 'perm') {
                var resp = jailClientPerm(client, move);
            } else {
                var resp = jailClientTemp(client, search.time, search.extension,  move);
            }
            switch(resp) {
                case 0:
                    sinusbot.chatPrivate(ev.clientId, 'Failed to Jail Client!');
                    return;
                case 1:
                    sinusbot.chatPrivate(ev.clientId, 'Moving Client to Jail for ' + msg[1] + ' ' + msg[2] + '!');
                    return;
                case 2:
                    sinusbot.chatPrivate(ev.clientId, 'Client moved Permanently to Jail!');
                    return;
                case 3:
                    sinusbot.chatPrivate(ev.clientId, 'Client is already Jailed!');
                    return;
                case 4:
                    sinusbot.chatPrivate(ev.clientId, 'Client can not be Jailed (Protected)!');
                    return;
                default:
                    sinusbot.chatPrivate(ev.clientId, 'Unknown Error occured while trying to Jail Client!');
                    return;
            }
            searchDelKey(ev.clientUid);
        } else if (ev.msg.startsWith('!jno')) {
            if (!checkPerm(ev.clientServerGroups)) {
                sinusbot.chatPrivate(ev.clientId, 'You are not allowed to use Jail Commands!');
                return;
            }
            var search = getSearch(ev.clientUid);
            if (search === false) {
                sinusbot.chatPrivate(ev.clientId, 'No Search Process active!');
                return;
            }
            var client = searchClientByName(search.search_str, search.excluded);
            if (!client) {
                searchDelKey(ev.clientUid);
                sinusbot.chatPrivate(ev.clientId, 'No more Clients found!');
                return;
            }
            sinusbot.chatPrivate(ev.clientId, 'Do you want to jail ' + clientUrlGen(client) + '?');
            sinusbot.chatPrivate(ev.clientId, 'Confirm with !jyes');
            sinusbot.chatPrivate(ev.clientId, 'Search Next Client or Descline with !jno');
            searchAdd(ev.clientUid, client);
            return;            
        } else if (ev.msg.startsWith('!jail')) {
            if (!checkPerm(ev.clientServerGroups)) {
                sinusbot.chatPrivate(ev.clientId, 'You are not allowed to use Jail Commands!');
                return;
            }
            switch (verifyJailCommand(ev.msg)) {
                case 10:
                    var msg = explode(' ', ev.msg);
                    var jailtype = 'temp';
                    var jailtime = parseInt(msg[1]);
                    var jailextension = msg[2];
                    var search = msg.slice(3);
                    search = search.join(' ');
                    var client = getClientByUrl(search);
                    var confirmation = false;
                    break;
                
                case 11:
                    var msg = explode(' ', ev.msg);
                    var search = msg.slice(3);
                    search = search.join(' ');
                    var jailtype = 'temp';
                    var jailtime = parseInt(msg[1]);
                    var jailextension = msg[2];
                    var client = searchClientByName(search, []);
                    var confirmation = true;
                    break;
                
                case 20:
                    var msg = explode(' ', ev.msg);
                    var jailtype = 'perm';
                    var search = msg.slice(1);
                    search = search.join(' ');
                    var client = getClientByUrl(search);
                    var confirmation = false;
                    break;
                
                case 21:
                    var msg = explode(' ', ev.msg);
                    var search = msg.slice(1);
                    search = search.join(' ');
                    var jailtype = 'perm';
                    var client = searchClientByName(search, []);
                    var confirmation = true;
                    break;
                
                default:
                    sinusbot.chatPrivate(ev.clientId, 'Invalid Usage!');
                    sinusbot.chatPrivate(ev.clientId, 'Command usage: !jail <EMPTY FOR Permanent|<time> <Seconds|Minutes|Hours|Days|Months>> <clienturl|uid|nick=<nickname>>');
                    return;
            }
            
            if (confirmation) {
                if (!client) {
                    sinusbot.chatPrivate(ev.clientId, 'No Client found with Nickname Part [b]' + search + '[/b]!');
                    return;
                }
                searchDelKey(ev.clientUid);
                sinusbot.chatPrivate(ev.clientId, 'Do you want to jail ' + clientUrlGen(client) + '?');
                sinusbot.chatPrivate(ev.clientId, 'Confirm with !jyes');
                sinusbot.chatPrivate(ev.clientId, 'Search Next Client or Descline with !jno');
                if (jailtype == 'perm') {
                    searchAdd(ev.clientUid, client, search, 'perm');
                } else {
                    searchAdd(ev.clientUid, client, search, 'temp', jailtime, jailextension);
                }
                return;
            }
            
            if (!client) {
                sinusbot.chatPrivate(ev.clientId, 'No Client found!');
                return;
            }
            if (jailtype == 'perm') {
                var resp = jailClientPerm(client);
            } else {
                var resp = jailClientTemp(client, jailtime, jailextension);
            }
            switch(resp) {
                case 0:
                    sinusbot.chatPrivate(ev.clientId, 'Failed to Jail Client!');
                    return;
                case 1:
                    sinusbot.chatPrivate(ev.clientId, 'Moving Client to Jail for ' + msg[1] + ' ' + msg[2] + '!');
                    return;
                case 2:
                    sinusbot.chatPrivate(ev.clientId, 'Client moved Permanently to Jail!');
                    return;
                case 3:
                    sinusbot.chatPrivate(ev.clientId, 'Client is already Jailed!');
                    return;
                case 4:
                    sinusbot.chatPrivate(ev.clientId, 'Client can not be Jailed (Protected)!');
                    return;
                default:
                    sinusbot.chatPrivate(ev.clientId, 'Unknown Error occured while trying to Jail Client!');
                    return;
            }
        } else if (ev.msg.startsWith('!unjail')) {
            if (!checkPerm(ev.clientServerGroups)) {
                sinusbot.chatPrivate(ev.clientId, 'You are not allowed to use Jail Commands!');
                return;
            }
            if (!verifyUnjailCommand(ev.msg)) {
                sinusbot.chatPrivate(ev.clientId, 'Invalid Usage!');
                sinusbot.chatPrivate(ev.clientId, 'Command usage: !unjail <clienturl/uid>');
                return;
            }
            var msg = explode(' ', ev.msg);
            var url = msg.slice();
            url.shift();
            var uid = getUidByUrl(url.join(' '));
            if (!uid) {
                sinusbot.chatPrivate(ev.clientId, 'Invalid UID or ClientURL given!');
                return;
            }
            var name = releaseUid(uid);
            if (name) {
                sinusbot.chatPrivate(ev.clientId, 'Client [URL=client://0/'+ uid + '~' + encodeURIComponent(name) + ']' + name + '[/URL] has been released from jail!');
            } else {
                sinusbot.chatPrivate(ev.clientId, 'No Client to release!');
            }
        }
    });
    
    sinusbot.on('clientMove', function(ev) {
        if (ev.oldChannel == config.b_jail_channel || ev.oldChannel == 0) {
            if (isJailed(ev.clientUid)) {
                sinusbot.move(ev.clientId, config.b_jail_channel);
                sinusbot.chatPrivate(ev.clientId, 'HA! You cant escape my Jail!');
            }
        }
    });
    
    sinusbot.on('record', function(ev) {
        if (config.c_jail_on_record == 1) return;
        var client = getClientById(ev.clientId);
        if (!client) return;
        if (config.d_jail_on_record_time == 0) {
            jailClientPerm(client);
        } else {
            jailClientTemp(client, config.d_jail_on_record_time, timeconvert_helper[config.e_jail_on_record_extension]);
        }
        sinusbot.chatPrivate(client.id, 'Reason: Recording!');
        return;
    });
    
    function jailcheck () {
        var jail = sinusbot.getVar('jail');
        if(typeof(jail) === 'undefined') return;
        var clients = getClientList('id');
        for (var j in jail) {
            var release = false;
            var block_release = false;
            if (jail[j]['release'] != 0 && jail[j]['release'] < Math.floor(Date.now() / 1000)) {
                if (config.c_jail_on_record == 0 && clients[j]['recording']) {
                    sinusbot.chatPrivate(clients[j].id, 'Will not Release since you are still recording!');
                    block_release = true;
                } else {
                    delete jail[j];
                    release = true;
                }
            }
            if (j in clients) {
                for (var k in clients[j]) {
                    if (release) {
                        sinusbot.kickChannel(clients[j][key].id, 'You have been released from Jail!');
                        sinusbot.chatPrivate(clients[j][key].id, 'You have been released from Jail!');
                    } else if (jail[j]['release'] != 0 && config.f_jail_message_intervall != 0){
                        if (!block_release && (jail_message_intervall_iteration % jail_message_intervall[config.f_jail_message_intervall] == 0)) {
                            sinusbot.chatPrivate(
                                clients[j][key].id,
                                'You will be for ' + timeToString(jail[j]['release'] - Math.floor(Date.now() / 1000)) + ' more in Jail!'
                            );
                        }
                    } else if (clients[j][key].cid != config.b_jail_channel) {                        
                        sinusbot.move(clients[j][key]['id'], config.b_jail_channel);
                        sinusbot.chatPrivate(clients[j][key]['id'], 'Huh! You thought you can escape me?');
                    }
                }
            }
        }
        sinusbot.setVar('jail', jail);
        if (jail_message_intervall_iteration >= 12) {
            jail_message_intervall_iteration = 1;
        } else {
            jail_message_intervall_iteration = jail_message_intervall_iteration + 1;
        }
    }
    
    
    function nextRelease() {
        releaseUid(nr[1]);
    }
    
    
    function clientUrlGen(client) {
        return '[URL=client://' + client.id + '/' + client.uid + '~' + encodeURIComponent(client.nick) + ']' + client.nick + '[/URL]';
    }
    
    function checkPerm(serverGroups) {
        if (typeof(config.a_allowed_groups) === 'undefined') return false;
        for (var grp in serverGroups) {
            if (inArray(serverGroups[grp].i, config.a_allowed_groups.split(','))) return true;
        }
        return false;
    }
    
    function verifyJailCommand(str) {
        if (str.match(
            /!jail[ ]{1,}([0-9]{1,}[ ]{1,}(minutes|seconds|hours|days|months|minute|second|hour|day|month)[ ]{1,})(\[URL=client:\/\/[0-9]{1,}\/[a-zA-Z0-9\/+]{27}=~[^.]{1,}\][^.]{1,}\[\/URL\]|[a-zA-Z0-9\/+]{27}=)/i  
        )) {
            return 10;
        } else if (str.match(
            /!jail[ ]{1,}([0-9]{1,}[ ]{1,}(minutes|seconds|hours|days|months|minute|second|hour|day|month)[ ]{1,})(.*)/i  
        )) {
            return 11;
        } else if (str.match(
            /!jail[ ]{1,}(\[URL=client:\/\/[0-9]{1,}\/[a-zA-Z0-9\/+]{27}=~[^.]{1,}\][^.]{1,}\[\/URL\]|[a-zA-Z0-9\/+]{27}=)/i  
        )) {
            return 20;
        } else if (str.match(
            /!jail[ ]{1,}(.*)/i
        )) {
            return 21;
        } else {
            return false;
        }
    }
    
    function verifyUnjailCommand(str) {
        if (str.match(
            /!unjail[ ]{1,}(\[URL=client:\/\/[0-9]{1,}\/[a-zA-Z0-9\/+]{27}=~[^.]{1,}\][^.]{1,}\[\/URL\]|[a-zA-Z0-9\/+]{27}=)/i  
        )) return true;
        return false;
    }
    
    function releaseUid(uid) {
        var jail = sinusbot.getVar('jail');
        if (!(uid in jail)) return false;
        var client = getClientByUid(uid);
        if (client) {
            var name = client.nick;
            sinusbot.kickChannel(client.id, 'You have been released from Jail!');
            sinusbot.chatPrivate(client.id, 'You have been released from Jail!');
        } else {
            var name = jail[uid]['nick'];
        }
        delete jail[uid];
        sinusbot.setVar('jail', jail);
        if (nr && uid == nr[1]) {
            nr = getNextRelease();
            if (nr !== false) {
                timeout = nr[0] * 1000 - Date.now();
                release = setTimeout(nextRelease, timeout);
            } else {
                release = undefined;
            }
        }
        return name;
    }
    
    function searchAdd(uid, client, search_str, type, time, extension) {
        if (uid in searcher) {
            searcher[uid]['excluded'].push(client.uid);
            searcher[uid]['selected'] = client;
        } else {
            searcher[uid] = {
                'selected': client,
                'excluded': [client.uid],
                'type': type,
                'time': time,
                'extension': extension,
                'search_str': search_str
            }
        }
    }
    
    function getSearch(uid) {
        if (uid in searcher) {
            return searcher[uid];
        }
        return false;
        
    }
    
    function searchDelKey(uid) {
        if (uid in searcher) {
            delete searcher[uid];
        }
        return;
    }
    
    function jailClientPerm(client, move) {
        var jail = sinusbot.getVar('jail');
        if(typeof(move) === 'undefined') move = true;
        if(typeof(jail) === 'undefined') jail = {};
        if (client.uid in jail) return 3;
        if (config.ab_protected_groups !== '') {
            for (var g in client.g) {
                if (inArray(client['g'][g]['i'], config.ab_protected_groups.split(','))) {
                    return 4;
                }
            }
        }
        jail[client.uid] = {'release': 0, 'nick': client.nick};
        sinusbot.setVar('jail', jail);
        if (move) sinusbot.move(client.id, config.b_jail_channel);
        if (move) sinusbot.chatPrivate(client.id, 'You have been permanently moved to Jail!');
        return 2;
    }
    
    function jailClientTemp(client, time, modifier, move) {
        var jail = sinusbot.getVar('jail');
        if(typeof(move) === 'undefined') move = true;
        if(typeof(jail) === 'undefined') jail = {};
        if (client.uid in jail) return 3;
        if (config.ab_protected_groups !== '') {
            for (var g in client.g) {
                if (inArray(client['g'][g]['i'], config.ab_protected_groups.split(','))) {
                    return 4;
                }
            }
        }
        var release = Math.floor(Date.now() / 1000 + time * timeconvert[modifier.toLowerCase()]);
        jail[client.uid] = {'release': release, 'nick': client.nick};
        sinusbot.setVar('jail', jail);
        if (move) sinusbot.move(client.id, config.b_jail_channel);
        if (move) sinusbot.chatPrivate(client.id, 'You have been moved to Jail for ' + time + ' ' + modifier + '!');     
        if (!(nr) || release < nr[0]) {
            nr = getNextRelease();
            if (nr !== false) {
                timeout = nr[0] * 1000 - Date.now();
                release = setTimeout(nextRelease, timeout);
            } else {
                release = undefined;
            }
        }
        return 1;
    }
    
    function getNextRelease(){
        var jail = sinusbot.getVar('jail');
        if(typeof(jail) === 'undefined') return false;
        var ret = [0, ''];
        for (uid in jail) {
            if ((jail[uid]['release'] < ret[0] || ret[0] == 0) && jail[uid]['release'] != 0) {
                ret[0] = jail[uid]['release'];
                ret[1] = uid;
            }
        }
        if (ret[0] == 0) return false;
        return ret;
    }
    
    function isJailed(uid) {
        var jail = sinusbot.getVar('jail');
        if(typeof(jail) === 'undefined') return false;
        if (uid in jail) return true;
        return false;
    }
    
    function getUidByUrl(url) {
        return url.match(/[a-zA-Z0-9\/+]{27}=/i);
    }

    function getClientByUrl(url) {
        var uid = getUidByUrl(url);
        if (!uid) return false;
        return getClientByUid(uid);
    }

    function getClientByUid(uid) {
        return getClientByParam('uid', uid);
    }
 
    function getClientById(id) {
        return getClientByParam('id', id);
    }

    function getClientByParam(search_key, search_value) {
        var channels = getChannels();
        for (var i = 0; i < channels.length; i++) {
            if (!channels[i].clients) continue;
            for (var key in channels[i]['clients']) {
                if (channels[i]['clients'][key][search_key] == search_value) {
                    return channels[i]['clients'][key];
                }
            }
        }
        return false;
    }
    
    function searchClientByName(name, excludeUid) {
        if (typeof(excludeUid) == 'undefined') var excludeUid = [];
        var channels = getChannels();
        for (var i = 0; i < channels.length; i++) {
            if (!channels[i].clients) continue;
            for (var key in channels[i]['clients']) {
                var nick = channels[i]['clients'][key]['nick'].toLowerCase();
                var regex = new RegExp(name.toLowerCase(), "i");
                if (
                    (excludeUid.indexOf(channels[i]['clients'][key]['uid']) == -1)
                    && nick.match(regex)
                ) {
                    return channels[i]['clients'][key];
                }
            }
        }
        return false;
    }
    
    function timeToString(time) {
        var str = "";
        if (Math.floor(time / 86400) > 0) {
            str = str + Math.floor(time / 86400) + ' days ';
        }
        if (Math.floor(time / 3600 % 24) > 0) {
            str = str + (Math.floor(time / 3600) % 24) + ' hours ';
        }
        if (Math.floor(time / 60 % 60) > 0) {
            str = str + (Math.floor(time / 60) % 60) + ' minutes ';
        }
        if (Math.floor(time) % 60 != 0) {
            str = str + Math.floor(time) % 60 + ' seconds';
        }
        return str;
    }
    
    function getClientList(assoc) {
        if (typeof(assoc) == 'undefined') var assoc = false;
        var channels = getChannels();
        if (assoc) {
            var clients = {};
        } else {
            var clients = [];
        }
        for (var i = 0; i < channels.length; i++) {
            if (!channels[i].clients) continue;
            for (var key in channels[i]['clients']) {
                var client = channels[i]['clients'][key];
                client.cid = channels[i]['id'];
                if (assoc) {
                    if (inArray(channels[i]['clients'][key][assoc], clients)) {
                       clients[channels[i]['clients'][key][assoc]].push(client);
                    } else {
                        clients[channels[i]['clients'][key][assoc]] = [client];
                    }
                } else {
                    clients.push(client);
                }
            }
        }
        return clients;
    }
    
    function explode(delimeter, str) {
        var ret = [];
        var splitted = str.split(delimeter);
        for (s in splitted) {
            if (splitted[s] != '') ret.push(splitted[s]);
        }
        return ret;
    }

    function ObjectLength( object ) {
        var length = 0;
        for( var key in object ) {
            if( object.hasOwnProperty(key) ) {
                ++length;
            }
        }
        return length;
    };
    
    String.prototype.startsWith = function (str) {
        return this.indexOf(str) == 0;
    }
    
    function inArray(needle, haystack) {
        var length = haystack.length;
        for(var i = 0; i < length; i++) {
            if(haystack[i] == needle) return true;
        }
        return false;
    }
});
