FROM public.ecr.aws/lambda/nodejs:18

# Install Chrome dependencies
RUN yum install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    nss \
    libnss3.so \
    && yum clean all \
    && rm -rf /var/cache/yum

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install --legacy-peer-deps

# Copy and build TypeScript files
COPY *.ts ./
RUN npm run build

# Clean up dev dependencies
RUN npm prune --production --legacy-peer-deps

# Set the Lambda handler
CMD [ "dist/index.handler" ]
