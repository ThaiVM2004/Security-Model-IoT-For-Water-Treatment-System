// them thu vien 
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/udp.h>
#include <linux/skbuff.h>
#include <linux/inet.h>

//license

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ThaiVM04");
MODULE_DESCRIPTION("Netfilter module");


// white list
static inline bool is_allowed_port(u16 port)
{
    return (port == 53 || port == 443 || port == 1883 || port == 67 || port == 68|| port == 22);
}

static unsigned int my_hookfn(void *priv,
                              struct sk_buff *skb,
                              const struct nf_hook_state *state)
{
    struct iphdr *iph;
    struct tcphdr *tcph;
    struct udphdr *udph;
    u16 dport = 0;
    u16 sport = 0;

    if (!skb)
        return NF_ACCEPT;

    iph = ip_hdr(skb);
    if (!iph)
        return NF_ACCEPT;

 
    if ((ntohl(iph->saddr) & 0xFF000000) == 0x7F000000 || 
        (ntohl(iph->daddr) & 0xFF000000) == 0x7F000000) {
        pr_info("ACCEPT: Loopback traffic\n");
        return NF_ACCEPT;
    }

    // Cho qua ICMP
    if (iph->protocol == IPPROTO_ICMP) {
        pr_info("ACCEPT: ICMP\n");
        return NF_ACCEPT;
    }

    // Xy ly tcp
    if (iph->protocol == IPPROTO_TCP) {
        tcph = tcp_hdr(skb); //Lay header
        if (!tcph)
            return NF_DROP; //Neu khong co header

        dport = ntohs(tcph->dest);
        sport = ntohs(tcph->source);

        pr_info("TCP: sport=%u dport=%u ACK=%d SYN=%d\n", 
                sport, dport, tcph->ack, tcph->syn);

        if (tcph->ack && !tcph->syn) {
            pr_info("ACCEPT: TCP established\n");
            return NF_ACCEPT;
        }

        if (is_allowed_port(dport) || is_allowed_port(sport)){
            pr_info("ACCEPT: TCP port %u/%u allowed\n", dport, sport);
            return NF_ACCEPT;
        } else {
            pr_info("DROP: TCP port %u/%u not allowed\n", dport, sport);
            return NF_DROP;
        }
    }

    // Xử lý UDP
    if (iph->protocol == IPPROTO_UDP) {
        udph = udp_hdr(skb);
        if (!udph)
            return NF_DROP;

        dport = ntohs(udph->dest);
        sport = ntohs(udph->source);
        
        pr_info("UDP: sport=%u dport=%u\n", sport, dport);
        
        if (is_allowed_port(dport) || is_allowed_port(sport)) {
            pr_info("ACCEPT: UDP port %u/%u allowed\n", dport, sport);
            return NF_ACCEPT;
        } else {
            pr_info("DROP: UDP port %u/%u not allowed\n", dport, sport);
            return NF_DROP;
        }
    }

    pr_info("ACCEPT: Other protocol %u\n", iph->protocol);
    return NF_ACCEPT;
}

//
static struct nf_hook_ops nfho_input = {
    .hook     = my_hookfn,
    .pf       = NFPROTO_IPV4,
    .hooknum  = NF_INET_LOCAL_IN, //Traffic into raspi
    .priority = NF_IP_PRI_FIRST,
};

static int __init nfmod_init(void)
{
    int ret;

    ret = nf_register_net_hook(&init_net, &nfho_input);
    if (ret) {
        pr_err("nf_register_net_hook LOCAL_IN failed: %d\n", ret);
        return ret;
    }

    pr_info("nf_allow loaded - filtering incoming traffic (loopback EXCLUDED)\n");

    return 0;
}

static void __exit nfmod_exit(void)
{
    nf_unregister_net_hook(&init_net, &nfho_input);
    pr_info("nf_allow unloaded\n");
}

module_init(nfmod_init);
module_exit(nfmod_exit)
