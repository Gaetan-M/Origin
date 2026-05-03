import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';

/// Home shell — bottom nav with 5 slots: Accueil, L'arbre, +, Connecter, Moi.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final tab = _tabFromLocation(location);

    return Scaffold(
      backgroundColor: OriginColors.sand,
      body: child,
      floatingActionButton: _AddFab(
        onTap: () => _openAddSheet(context),
      ),
      floatingActionButtonLocation:
          FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _BottomBar(
        currentTab: tab,
        onTap: (newTab) => _go(context, newTab),
      ),
    );
  }

  void _go(BuildContext context, _HomeTab tab) {
    switch (tab) {
      case _HomeTab.dashboard:
        context.go(RoutePaths.homeDashboard);
      case _HomeTab.tree:
        context.go(RoutePaths.homeTree);
      case _HomeTab.connect:
        context.go(RoutePaths.homeConnect);
      case _HomeTab.profile:
        context.go(RoutePaths.homeProfile);
    }
  }

  void _openAddSheet(BuildContext context) {
    OriginBottomSheet.show<void>(
      context: context,
      title: 'Ajouter quelqu\'un',
      subtitle: 'Choisis qui tu veux ajouter à ton arbre.',
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.elderly_outlined,
          label: 'Ajouter un parent',
          subtitle: 'Papa, maman, grand-père, grand-mère…',
          onTap: () async => context.push(RoutePaths.personNew),
        ),
        OriginBottomSheetAction(
          icon: Icons.child_care_outlined,
          label: 'Ajouter un enfant',
          subtitle: 'Fils, fille, neveu, nièce…',
          onTap: () async => context.push(RoutePaths.personNew),
        ),
        OriginBottomSheetAction(
          icon: Icons.favorite_outline,
          label: 'Ajouter un conjoint ou frère/sœur',
          onTap: () async => context.push(RoutePaths.personNew),
        ),
        OriginBottomSheetAction(
          icon: Icons.qr_code_2_outlined,
          label: 'Rejoindre un code famille',
          onTap: () async => context.push(RoutePaths.familyCodeRedeem),
        ),
      ],
    );
  }

  _HomeTab _tabFromLocation(String location) {
    if (location.startsWith(RoutePaths.homeTree)) return _HomeTab.tree;
    if (location.startsWith(RoutePaths.homeConnect)) return _HomeTab.connect;
    if (location.startsWith(RoutePaths.homeProfile)) return _HomeTab.profile;
    return _HomeTab.dashboard;
  }
}

enum _HomeTab { dashboard, tree, connect, profile }

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.currentTab, required this.onTap});

  final _HomeTab currentTab;
  final ValueChanged<_HomeTab> onTap;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: <Widget>[
              _NavItem(
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: 'Accueil',
                active: currentTab == _HomeTab.dashboard,
                onTap: () => onTap(_HomeTab.dashboard),
              ),
              _NavItem(
                icon: Icons.account_tree_outlined,
                activeIcon: Icons.account_tree,
                label: "L'arbre",
                active: currentTab == _HomeTab.tree,
                onTap: () => onTap(_HomeTab.tree),
              ),
              const SizedBox(width: 56), // FAB notch
              _NavItem(
                icon: Icons.share_outlined,
                activeIcon: Icons.share,
                label: 'Connecter',
                active: currentTab == _HomeTab.connect,
                onTap: () => onTap(_HomeTab.connect),
              ),
              _NavItem(
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                label: 'Moi',
                active: currentTab == _HomeTab.profile,
                onTap: () => onTap(_HomeTab.profile),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color =
        active ? OriginColors.deepBlue : OriginColors.textMuted;
    return Expanded(
      child: Semantics(
        label: label,
        button: true,
        selected: active,
        child: InkWell(
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(active ? activeIcon : icon, color: color, size: 24),
              const SizedBox(height: 2),
              Text(
                label,
                style: OriginTextStyles.micro.copyWith(
                  color: color,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddFab extends StatelessWidget {
  const _AddFab({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Material(
        color: OriginColors.terracotta,
        elevation: 6,
        shadowColor:
            OriginColors.terracotta.withValues(alpha: 0.4),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: const SizedBox(
            width: 56,
            height: 56,
            child: Icon(
              Icons.add,
              color: OriginColors.offWhite,
              size: 28,
              semanticLabel: 'Ajouter',
            ),
          ),
        ),
      ),
    );
  }
}

