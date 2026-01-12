obj-m += nf_kernel.o

KDIR ?= /lib/modules/6.12.47+rpt-rpi-v8/build

PWD  := $(shell pwd)

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

