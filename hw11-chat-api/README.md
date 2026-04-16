build
```bash
docker build . -t ctnelson1997/cs571-s26-hw11-chat-api
docker push ctnelson1997/cs571-s26-hw11-chat-api
```

run
```bash
docker pull ctnelson1997/cs571-s26-hw11-chat-api
docker run --name=cs571_s26_hw11_chat_api -d --restart=always -p 58112:58112 -v /cs571/s26/hw11-chat:/cs571 ctnelson1997/cs571-s26-hw11-chat-api
```
