var childProcess = require("child_process");
var portfinder = require('portfinder');
var assert = require("assert");

/**
 * Merges values from both obj1 and obj2, overwriting obj1's values and adding obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_options(obj1,obj2){
    var obj3 = {};
    for (var attr in obj1) { obj3[attr] = obj1[attr]; }
    for (var attr in obj2) { obj3[attr] = obj2[attr]; }
    return obj3;
}

/**
 * Connect to the remote SSH host, then open a tunnel to the Target Host.
 * After that, executes a given callback and then closes the tunnel.
 */
function tunnelExec(options, callback) {

    var defaultOptions = {
        user: null,
        identityFile: null,
        localPort: null,

        // Host which is being SSH'd
        remoteHost: null,
        remotePort: 22,

        // Jump hosts support. Hops will be used in the order of the array
        jumpHosts: [],

        // Target host, will receive the commands executed through the tunnel
        targetHost: null,
        targetPort: null,

        // Enable compression
        compression: false,

        // Connection timeout
        timeout: 15000
    };

    var params = merge_options(defaultOptions, options);

    if(!params.remoteHost){
        callback(new Error('Missing remoteHost'));
        return false;
    }

    if(!params.targetPort){
        callback(new Error('missing targetPort'));
        return false;
    }

    // If no local port is set, we find one through portfinder
    if (!params.localPort) {
        return portfinder.getPort(function(err, port) {
            params.localPort = port;
            tunnelExec(params, cb);
        });
    }

    // Builds remote host string
    var connectHost = params.remoteHost;
    if(params.user){
        connectHost = params.user + "@" + connectHost;
    }

    // If no target Host, assume is the same as the remoteHost
    if(!params.targetHost){
        params.targetHost = params.remoteHost;
    }

    // Sets arguments for the ssh command
    var args = [
        "-p",
        params.remotePort,
        connectHost,
        "-L",
        params.localPort + ":" + params.targetHost + ':' + params.targetPort,
        "-N",
        "-v"
    ];

    // Adds identityFile if any exists
    if(params.identityFile){
        args.push('-i');
        args.push(params.identityFile);
    }

    // Jumps hosts support
    if (params.jumpHosts) {
        const hops = [];

        params.jumpHosts.forEach((hop) => {
            const { user = params.user || '', host, port = params.remotePort } = hop;

            hops.push(`${user && `${user}@`}${host}:${port}`);
        });

        // If we have at least one jump host, we amend the CLI arguments to include -J hop1,hop2,hop3,...
        if (hops.length > 0) {
            args.push('-J');
            args.push(hops.join(','));
        }
    }

    // Compression support
    if (params.compression) {
        args.push('-C');
    }

    // Force native (english) language, so we can read debug messages correctly
    process.env['LANG'] = 'C';

    var child = childProcess.spawn("ssh", args);
    var timeoutKillProcess = setTimeout(kill, params.timeout);

    function kill() {
        child.kill('SIGKILL');
        callback(new Error('Error establishing SSH connection'));
    }

    function close() {
        child.kill('SIGKILL');
    }

    // When the process receives data, process it and start callback (if forwarding succeded)
    child.stderr.on('data', function bootload(data) {

        if (data.toString().match(/local forwarding listening/i)) {
            clearTimeout(timeoutKillProcess);
            child.stderr.removeListener('data', bootload);

            callback(null, {
                close: close,
                params: params
            });
        }

    });
}

module.exports = tunnelExec;
