Vagrant.configure("2") do |config|
  # Define all VMs in a single Vagrantfile
  
  # Ubuntu 20.04 (Focal)
  config.vm.define "ubuntu_focal" do |focal|
    focal.vm.box = "ubuntu/focal64"
    focal.vm.hostname = "ubuntu-focal"
    focal.vm.provision "shell", inline: $nodejs_setup
  end
  
  # Ubuntu 22.04 (Jammy)
  config.vm.define "ubuntu_jammy" do |jammy|
    jammy.vm.box = "ubuntu/jammy64"
    jammy.vm.hostname = "ubuntu-jammy"
    jammy.vm.provision "shell", inline: $nodejs_setup
  end
  
  # Debian 10 (Buster)
  config.vm.define "debian_buster" do |buster|
    buster.vm.box = "debian/buster64"
    buster.vm.hostname = "debian-buster"
    buster.vm.provision "shell", inline: $nodejs_setup
  end
  
  # Debian 11 (Bullseye)
  config.vm.define "debian_bullseye" do |bullseye|
    bullseye.vm.box = "debian/bullseye64"
    bullseye.vm.hostname = "debian-bullseye"
    bullseye.vm.provision "shell", inline: $nodejs_setup
  end
  
  # Debian 12 (Bookworm)
  config.vm.define "debian_bookworm" do |bookworm|
    bookworm.vm.box = "debian/bookworm64"
    bookworm.vm.hostname = "debian-bookworm"
    bookworm.vm.provision "shell", inline: $nodejs_setup
  end
  
  # Rocky Linux 8
  config.vm.define "rockylinux_8" do |rocky8|
    rocky8.vm.box = "rockylinux/8"
    rocky8.vm.hostname = "rocky-8"
    rocky8.vm.provision "shell", inline: $rocky_nodejs_setup
  end
  
  # Rocky Linux 9
  config.vm.define "rockylinux_9" do |rocky9|
    rocky9.vm.box = "rockylinux/9"
    rocky9.vm.hostname = "rocky-9"
    rocky9.vm.provision "shell", inline: $rocky_nodejs_setup
  end
  
  # AlmaLinux 8
  config.vm.define "almalinux_8" do |alma8|
    alma8.vm.box = "almalinux/8"
    alma8.vm.hostname = "alma-8"
    alma8.vm.provision "shell", inline: $rocky_nodejs_setup
  end
  
  # AlmaLinux 9
  config.vm.define "almalinux_9" do |alma9|
    alma9.vm.box = "almalinux/9"
    alma9.vm.hostname = "alma-9"
    alma9.vm.provision "shell", inline: $rocky_nodejs_setup
  end
  
  # Common configuration
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
    vb.cpus = 1
  end
  
  # Synced folder for the project
  config.vm.synced_folder ".", "/vagrant_data", type: "rsync",
    rsync__exclude: [".git/", "node_modules/"]
  
  # Node.js setup script for Debian/Ubuntu
  $nodejs_setup = <<-SCRIPT
    echo "Installing Node.js on Debian/Ubuntu..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    NODE_MAJOR=20
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update
    apt-get install -y nodejs
    
    # Set up project
    mkdir -p /app
    cp -r /vagrant_data/* /app/
    cd /app
    npm install
    
    # Verify installation
    node -v
    npm -v
  SCRIPT
  
  # Node.js setup script for Rocky Linux/AlmaLinux
  $rocky_nodejs_setup = <<-SCRIPT
    echo "Installing Node.js on Rocky Linux/AlmaLinux..."
    dnf install -y curl
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
    
    # Set up project
    mkdir -p /app
    cp -r /vagrant_data/* /app/
    cd /app
    npm install
    
    # Verify installation
    node -v
    npm -v
  SCRIPT
end
