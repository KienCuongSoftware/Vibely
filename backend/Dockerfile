FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
ARG MAVEN_ARGS="-DskipTests package"
RUN mvn -q ${MAVEN_ARGS}

FROM eclipse-temurin:17-jre-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system vibely && useradd --system --gid vibely --home-dir /app vibely

WORKDIR /app
COPY --from=build /workspace/target/vibely-backend-*.jar /app/app.jar
RUN chown -R vibely:vibely /app

USER vibely

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=prod
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV JAVA_OPTS=""

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
