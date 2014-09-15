tunnel-exec
===========

Opens an ssh connection, then a local tunnel to another host from there. After that, you can execute any action on the tunnel.

```js
var tunnelExec = require('tunnel-exec')

tunnelExec(
    {
        remoteHost: 'example.com',
        remotePort: '22',

        targetHost: 'host2.example.com',
        targetPort: '1234',

        localPort: 9009,

        user: 'myUser',
        identityFile: '~/.ssh/id_rsa.pub',

        timeout: 30000
    },
    function(err, tunnel) {
      if(err) {
        console.log(err)
        process.exit(1)
      }

      // Do your stuff here

      // Close the tunnel
      tunnel.done()
    }
)
```

The previous options calls the ssh command as follows:

```bash
ssh -p 22 -L 9009:host2.example.com:1234 -i ~/.ssh/id_rsa.pub myUser@example.com
```

If the connection is not established within 30 seconds, the process stops with an error.


License
-------

MIT
